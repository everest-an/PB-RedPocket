package service

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

// ERC-4337 Account Abstraction Client for Pimlico
type AAClient struct {
	bundlerURL   string
	paymasterURL string
	entryPoint   string
	httpClient   *http.Client
}

func NewAAClient(bundlerURL, paymasterURL, entryPoint string) *AAClient {
	return &AAClient{
		bundlerURL:   bundlerURL,
		paymasterURL: paymasterURL,
		entryPoint:   entryPoint,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// UserOperation represents an ERC-4337 user operation
type UserOperation struct {
	Sender               string `json:"sender"`
	Nonce                string `json:"nonce"`
	InitCode             string `json:"initCode"`
	CallData             string `json:"callData"`
	CallGasLimit         string `json:"callGasLimit"`
	VerificationGasLimit string `json:"verificationGasLimit"`
	PreVerificationGas   string `json:"preVerificationGas"`
	MaxFeePerGas         string `json:"maxFeePerGas"`
	MaxPriorityFeePerGas string `json:"maxPriorityFeePerGas"`
	PaymasterAndData     string `json:"paymasterAndData"`
	Signature            string `json:"signature"`
}

// JSON-RPC request/response
type jsonRPCRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      int           `json:"id"`
}

type jsonRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *jsonRPCError   `json:"error,omitempty"`
	ID      int             `json:"id"`
}

type jsonRPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// GetAccountNonce gets the nonce for an AA wallet
func (c *AAClient) GetAccountNonce(ctx context.Context, sender string) (*big.Int, error) {
	req := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  "eth_getTransactionCount",
		Params:  []interface{}{sender, "latest"},
		ID:      1,
	}

	resp, err := c.call(ctx, c.bundlerURL, req)
	if err != nil {
		return big.NewInt(0), nil // Default to 0 for new accounts
	}

	var nonceHex string
	if err := json.Unmarshal(resp.Result, &nonceHex); err != nil {
		return big.NewInt(0), nil
	}

	nonce := new(big.Int)
	nonce.SetString(nonceHex[2:], 16)
	return nonce, nil
}

// BuildERC20TransferCallData builds calldata for ERC20 transfer
func BuildERC20TransferCallData(tokenAddress, to string, amount *big.Int) string {
	// ERC20 transfer(address,uint256) selector: 0xa9059cbb
	methodID := "a9059cbb"
	
	// Pad address to 32 bytes
	toAddr := common.HexToAddress(to)
	paddedTo := common.LeftPadBytes(toAddr.Bytes(), 32)
	
	// Pad amount to 32 bytes
	paddedAmount := common.LeftPadBytes(amount.Bytes(), 32)
	
	return "0x" + methodID + hex.EncodeToString(paddedTo) + hex.EncodeToString(paddedAmount)
}

// BuildExecuteCallData builds calldata for AA wallet execute function
func BuildExecuteCallData(to string, value *big.Int, data string) string {
	// execute(address,uint256,bytes) selector
	methodID := "b61d27f6"
	
	toAddr := common.HexToAddress(to)
	paddedTo := common.LeftPadBytes(toAddr.Bytes(), 32)
	paddedValue := common.LeftPadBytes(value.Bytes(), 32)
	
	// Data offset (96 bytes = 0x60)
	dataOffset := common.LeftPadBytes(big.NewInt(96).Bytes(), 32)
	
	// Data bytes
	dataBytes, _ := hex.DecodeString(data[2:]) // Remove 0x prefix
	dataLen := common.LeftPadBytes(big.NewInt(int64(len(dataBytes))).Bytes(), 32)
	
	// Pad data to 32 bytes boundary
	paddedData := dataBytes
	if len(dataBytes)%32 != 0 {
		padding := make([]byte, 32-len(dataBytes)%32)
		paddedData = append(dataBytes, padding...)
	}
	
	return "0x" + methodID + 
		hex.EncodeToString(paddedTo) + 
		hex.EncodeToString(paddedValue) + 
		hex.EncodeToString(dataOffset) + 
		hex.EncodeToString(dataLen) + 
		hex.EncodeToString(paddedData)
}

// EstimateUserOperationGas estimates gas for a user operation
func (c *AAClient) EstimateUserOperationGas(ctx context.Context, op *UserOperation) (*UserOperation, error) {
	req := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  "eth_estimateUserOperationGas",
		Params:  []interface{}{op, c.entryPoint},
		ID:      1,
	}

	resp, err := c.call(ctx, c.bundlerURL, req)
	if err != nil {
		// Use default gas values if estimation fails
		op.CallGasLimit = "0x50000"         // 327680
		op.VerificationGasLimit = "0x50000" // 327680
		op.PreVerificationGas = "0xc350"    // 50000
		return op, nil
	}

	var gasEstimate struct {
		CallGasLimit         string `json:"callGasLimit"`
		VerificationGasLimit string `json:"verificationGasLimit"`
		PreVerificationGas   string `json:"preVerificationGas"`
	}
	if err := json.Unmarshal(resp.Result, &gasEstimate); err != nil {
		return op, nil
	}

	op.CallGasLimit = gasEstimate.CallGasLimit
	op.VerificationGasLimit = gasEstimate.VerificationGasLimit
	op.PreVerificationGas = gasEstimate.PreVerificationGas
	return op, nil
}

// SponsorUserOperation gets paymaster sponsorship
func (c *AAClient) SponsorUserOperation(ctx context.Context, op *UserOperation, chainID int64) (*UserOperation, error) {
	if c.paymasterURL == "" {
		return op, nil
	}

	req := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  "pm_sponsorUserOperation",
		Params: []interface{}{
			op,
			c.entryPoint,
			map[string]string{
				"sponsorshipPolicyId": "sp_cheerful_puma", // Pimlico default policy
			},
		},
		ID: 1,
	}

	resp, err := c.call(ctx, c.paymasterURL, req)
	if err != nil {
		return op, fmt.Errorf("paymaster sponsorship failed: %w", err)
	}

	var sponsorResult struct {
		PaymasterAndData     string `json:"paymasterAndData"`
		CallGasLimit         string `json:"callGasLimit,omitempty"`
		VerificationGasLimit string `json:"verificationGasLimit,omitempty"`
		PreVerificationGas   string `json:"preVerificationGas,omitempty"`
	}
	if err := json.Unmarshal(resp.Result, &sponsorResult); err != nil {
		return op, fmt.Errorf("failed to parse sponsor result: %w", err)
	}

	op.PaymasterAndData = sponsorResult.PaymasterAndData
	if sponsorResult.CallGasLimit != "" {
		op.CallGasLimit = sponsorResult.CallGasLimit
	}
	if sponsorResult.VerificationGasLimit != "" {
		op.VerificationGasLimit = sponsorResult.VerificationGasLimit
	}
	if sponsorResult.PreVerificationGas != "" {
		op.PreVerificationGas = sponsorResult.PreVerificationGas
	}

	return op, nil
}

// SignUserOperation signs the user operation
func SignUserOperation(op *UserOperation, privateKeyHex string, chainID int64, entryPoint string) (*UserOperation, error) {
	// Compute userOpHash
	hash := computeUserOpHash(op, chainID, entryPoint)
	
	// Sign with private key
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	// Sign the hash (with Ethereum prefix)
	prefixedHash := crypto.Keccak256([]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n32%s", string(hash))))
	signature, err := crypto.Sign(prefixedHash, privateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to sign: %w", err)
	}

	// Adjust v value for Ethereum
	if signature[64] < 27 {
		signature[64] += 27
	}

	op.Signature = "0x" + hex.EncodeToString(signature)
	return op, nil
}

func computeUserOpHash(op *UserOperation, chainID int64, entryPoint string) []byte {
	// Pack user operation fields
	packed := packUserOp(op)
	opHash := crypto.Keccak256(packed)
	
	// Pack with entry point and chain ID
	entryPointAddr := common.HexToAddress(entryPoint)
	chainIDBig := big.NewInt(chainID)
	
	final := append(opHash, entryPointAddr.Bytes()...)
	final = append(final, common.LeftPadBytes(chainIDBig.Bytes(), 32)...)
	
	return crypto.Keccak256(final)
}

func packUserOp(op *UserOperation) []byte {
	// Simplified packing - in production use proper ABI encoding
	var packed []byte
	
	sender := common.HexToAddress(op.Sender)
	packed = append(packed, common.LeftPadBytes(sender.Bytes(), 32)...)
	
	nonce, _ := new(big.Int).SetString(op.Nonce[2:], 16)
	packed = append(packed, common.LeftPadBytes(nonce.Bytes(), 32)...)
	
	initCode, _ := hex.DecodeString(op.InitCode[2:])
	packed = append(packed, crypto.Keccak256(initCode)...)
	
	callData, _ := hex.DecodeString(op.CallData[2:])
	packed = append(packed, crypto.Keccak256(callData)...)
	
	// Gas values
	callGas, _ := new(big.Int).SetString(op.CallGasLimit[2:], 16)
	verificationGas, _ := new(big.Int).SetString(op.VerificationGasLimit[2:], 16)
	preVerificationGas, _ := new(big.Int).SetString(op.PreVerificationGas[2:], 16)
	maxFee, _ := new(big.Int).SetString(op.MaxFeePerGas[2:], 16)
	maxPriority, _ := new(big.Int).SetString(op.MaxPriorityFeePerGas[2:], 16)
	
	packed = append(packed, common.LeftPadBytes(callGas.Bytes(), 32)...)
	packed = append(packed, common.LeftPadBytes(verificationGas.Bytes(), 32)...)
	packed = append(packed, common.LeftPadBytes(preVerificationGas.Bytes(), 32)...)
	packed = append(packed, common.LeftPadBytes(maxFee.Bytes(), 32)...)
	packed = append(packed, common.LeftPadBytes(maxPriority.Bytes(), 32)...)
	
	paymasterData, _ := hex.DecodeString(op.PaymasterAndData[2:])
	packed = append(packed, crypto.Keccak256(paymasterData)...)
	
	return packed
}

// SendUserOperation sends the user operation to the bundler
func (c *AAClient) SendUserOperation(ctx context.Context, op *UserOperation) (string, error) {
	req := jsonRPCRequest{
		JSONRPC: "2.0",
		Method:  "eth_sendUserOperation",
		Params:  []interface{}{op, c.entryPoint},
		ID:      1,
	}

	resp, err := c.call(ctx, c.bundlerURL, req)
	if err != nil {
		return "", fmt.Errorf("failed to send user operation: %w", err)
	}

	var userOpHash string
	if err := json.Unmarshal(resp.Result, &userOpHash); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return userOpHash, nil
}

// WaitForUserOperationReceipt waits for the user operation to be included
func (c *AAClient) WaitForUserOperationReceipt(ctx context.Context, userOpHash string, timeout time.Duration) (string, error) {
	deadline := time.Now().Add(timeout)
	
	for time.Now().Before(deadline) {
		req := jsonRPCRequest{
			JSONRPC: "2.0",
			Method:  "eth_getUserOperationReceipt",
			Params:  []interface{}{userOpHash},
			ID:      1,
		}

		resp, err := c.call(ctx, c.bundlerURL, req)
		if err == nil && resp.Result != nil {
			var receipt struct {
				Receipt struct {
					TransactionHash string `json:"transactionHash"`
				} `json:"receipt"`
				Success bool `json:"success"`
			}
			if err := json.Unmarshal(resp.Result, &receipt); err == nil && receipt.Receipt.TransactionHash != "" {
				return receipt.Receipt.TransactionHash, nil
			}
		}

		time.Sleep(2 * time.Second)
	}

	return "", fmt.Errorf("timeout waiting for user operation receipt")
}

func (c *AAClient) call(ctx context.Context, url string, req jsonRPCRequest) (*jsonRPCResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer httpResp.Body.Close()

	respBody, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, err
	}

	var resp jsonRPCResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, err
	}

	if resp.Error != nil {
		return nil, fmt.Errorf("RPC error %d: %s", resp.Error.Code, resp.Error.Message)
	}

	return &resp, nil
}
