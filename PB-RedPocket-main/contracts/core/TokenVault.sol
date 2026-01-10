// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenVault
 * @notice Multi-token vault for Protocol Bank RedPocket campaigns
 * @dev Supports ETH and ERC20 tokens with batch distribution capabilities
 */
contract TokenVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===========================================
    // Constants
    // ===========================================

    /// @notice Native ETH address placeholder
    address public constant ETH_ADDRESS = address(0);

    // ===========================================
    // State Variables
    // ===========================================

    /// @notice Enterprise balances: enterprise => token => balance
    mapping(address => mapping(address => uint256)) public enterpriseBalances;

    /// @notice Authorized operators who can execute distributions
    mapping(address => bool) public operators;

    /// @notice Multi-sig threshold for large withdrawals
    uint256 public multiSigThreshold;

    /// @notice Pending multi-sig withdrawals
    mapping(bytes32 => WithdrawalRequest) public pendingWithdrawals;

    /// @notice Multi-sig signers
    mapping(address => bool) public signers;

    /// @notice Number of required signatures
    uint256 public requiredSignatures;

    /// @notice Total signers count
    uint256 public signerCount;

    // ===========================================
    // Structs
    // ===========================================

    struct WithdrawalRequest {
        address enterprise;
        address token;
        uint256 amount;
        address recipient;
        uint256 approvalCount;
        bool executed;
        mapping(address => bool) approvals;
    }

    struct Distribution {
        address recipient;
        uint256 amount;
    }

    // ===========================================
    // Events
    // ===========================================

    event Deposited(
        address indexed enterprise,
        address indexed token,
        uint256 amount
    );

    event Withdrawn(
        address indexed enterprise,
        address indexed token,
        uint256 amount,
        address indexed recipient
    );

    event BatchDistributed(
        address indexed enterprise,
        address indexed token,
        uint256 totalAmount,
        uint256 recipientCount
    );

    event OperatorUpdated(address indexed operator, bool status);
    event SignerUpdated(address indexed signer, bool status);
    event MultiSigThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event WithdrawalRequested(bytes32 indexed requestId, address indexed enterprise, address token, uint256 amount);
    event WithdrawalApproved(bytes32 indexed requestId, address indexed signer);
    event WithdrawalExecuted(bytes32 indexed requestId);

    // ===========================================
    // Errors
    // ===========================================

    error InsufficientBalance();
    error InvalidAmount();
    error InvalidRecipient();
    error NotOperator();
    error NotSigner();
    error AlreadyApproved();
    error AlreadyExecuted();
    error InsufficientApprovals();
    error TransferFailed();
    error ArrayLengthMismatch();


    // ===========================================
    // Modifiers
    // ===========================================

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    modifier onlySigner() {
        if (!signers[msg.sender]) revert NotSigner();
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================

    constructor(
        uint256 _multiSigThreshold,
        uint256 _requiredSignatures
    ) Ownable(msg.sender) {
        multiSigThreshold = _multiSigThreshold;
        requiredSignatures = _requiredSignatures;
        signers[msg.sender] = true;
        signerCount = 1;
    }

    // ===========================================
    // Deposit Functions
    // ===========================================

    /// @notice Deposit ETH to enterprise balance
    function depositETH() external payable {
        if (msg.value == 0) revert InvalidAmount();
        enterpriseBalances[msg.sender][ETH_ADDRESS] += msg.value;
        emit Deposited(msg.sender, ETH_ADDRESS, msg.value);
    }

    /// @notice Deposit ERC20 tokens to enterprise balance
    /// @param token Token address
    /// @param amount Amount to deposit
    function depositToken(address token, uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        if (token == ETH_ADDRESS) revert InvalidAmount();
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        enterpriseBalances[msg.sender][token] += amount;
        
        emit Deposited(msg.sender, token, amount);
    }

    // ===========================================
    // Withdrawal Functions
    // ===========================================

    /// @notice Withdraw funds (may require multi-sig for large amounts)
    /// @param token Token address (address(0) for ETH)
    /// @param amount Amount to withdraw
    /// @param recipient Recipient address
    function withdraw(
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidRecipient();
        if (enterpriseBalances[msg.sender][token] < amount) revert InsufficientBalance();

        // Check if multi-sig is required
        if (amount >= multiSigThreshold && requiredSignatures > 1) {
            // Create multi-sig request
            bytes32 requestId = keccak256(
                abi.encodePacked(msg.sender, token, amount, recipient, block.timestamp)
            );
            
            WithdrawalRequest storage request = pendingWithdrawals[requestId];
            request.enterprise = msg.sender;
            request.token = token;
            request.amount = amount;
            request.recipient = recipient;
            request.approvalCount = 0;
            request.executed = false;
            
            emit WithdrawalRequested(requestId, msg.sender, token, amount);
            return;
        }

        // Execute immediate withdrawal
        _executeWithdrawal(msg.sender, token, amount, recipient);
    }

    /// @notice Approve a pending multi-sig withdrawal
    /// @param requestId The withdrawal request ID
    function approveWithdrawal(bytes32 requestId) external onlySigner {
        WithdrawalRequest storage request = pendingWithdrawals[requestId];
        
        if (request.executed) revert AlreadyExecuted();
        if (request.approvals[msg.sender]) revert AlreadyApproved();
        
        request.approvals[msg.sender] = true;
        request.approvalCount++;
        
        emit WithdrawalApproved(requestId, msg.sender);
        
        // Execute if enough approvals
        if (request.approvalCount >= requiredSignatures) {
            _executeWithdrawal(
                request.enterprise,
                request.token,
                request.amount,
                request.recipient
            );
            request.executed = true;
            emit WithdrawalExecuted(requestId);
        }
    }

    /// @dev Internal withdrawal execution
    function _executeWithdrawal(
        address enterprise,
        address token,
        uint256 amount,
        address recipient
    ) internal {
        enterpriseBalances[enterprise][token] -= amount;
        
        if (token == ETH_ADDRESS) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
        
        emit Withdrawn(enterprise, token, amount, recipient);
    }

    // ===========================================
    // Distribution Functions
    // ===========================================

    /// @notice Distribute tokens to multiple recipients (batch)
    /// @param enterprise Enterprise address
    /// @param token Token address
    /// @param recipients Array of recipient addresses
    /// @param amounts Array of amounts
    function batchDistribute(
        address enterprise,
        address token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOperator nonReentrant {
        if (recipients.length != amounts.length) revert ArrayLengthMismatch();
        if (recipients.length == 0) revert InvalidAmount();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        if (enterpriseBalances[enterprise][token] < totalAmount) revert InsufficientBalance();
        
        enterpriseBalances[enterprise][token] -= totalAmount;

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) revert InvalidRecipient();
            
            if (token == ETH_ADDRESS) {
                (bool success, ) = payable(recipients[i]).call{value: amounts[i]}("");
                if (!success) revert TransferFailed();
            } else {
                IERC20(token).safeTransfer(recipients[i], amounts[i]);
            }
        }

        emit BatchDistributed(enterprise, token, totalAmount, recipients.length);
    }

    /// @notice Single distribution (for RedPocket claims)
    /// @param enterprise Enterprise address
    /// @param token Token address
    /// @param recipient Recipient address
    /// @param amount Amount to distribute
    function distribute(
        address enterprise,
        address token,
        address recipient,
        uint256 amount
    ) external onlyOperator nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidRecipient();
        if (enterpriseBalances[enterprise][token] < amount) revert InsufficientBalance();

        enterpriseBalances[enterprise][token] -= amount;

        if (token == ETH_ADDRESS) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }

        emit Withdrawn(enterprise, token, amount, recipient);
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    /// @notice Set operator status
    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
        emit OperatorUpdated(operator, status);
    }

    /// @notice Set signer status
    function setSigner(address signer, bool status) external onlyOwner {
        if (status && !signers[signer]) {
            signerCount++;
        } else if (!status && signers[signer]) {
            signerCount--;
        }
        signers[signer] = status;
        emit SignerUpdated(signer, status);
    }

    /// @notice Update multi-sig threshold
    function setMultiSigThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = multiSigThreshold;
        multiSigThreshold = newThreshold;
        emit MultiSigThresholdUpdated(oldThreshold, newThreshold);
    }

    /// @notice Update required signatures
    function setRequiredSignatures(uint256 newRequired) external onlyOwner {
        require(newRequired <= signerCount, "Too many required");
        requiredSignatures = newRequired;
    }

    // ===========================================
    // View Functions
    // ===========================================

    /// @notice Get enterprise balance for a token
    function getBalance(address enterprise, address token) external view returns (uint256) {
        return enterpriseBalances[enterprise][token];
    }

    /// @notice Check if address is operator
    function isOperator(address addr) external view returns (bool) {
        return operators[addr] || addr == owner();
    }

    /// @notice Check if address is signer
    function isSigner(address addr) external view returns (bool) {
        return signers[addr];
    }

    // ===========================================
    // Receive ETH
    // ===========================================

    receive() external payable {
        enterpriseBalances[msg.sender][ETH_ADDRESS] += msg.value;
        emit Deposited(msg.sender, ETH_ADDRESS, msg.value);
    }
}
