// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title Paymaster
 * @notice ERC-4337 Paymaster for gas sponsorship in Protocol Bank
 * @dev Sponsors gas for RedPocket claims and social identity wallet creation
 */
contract Paymaster is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===========================================
    // Constants
    // ===========================================

    uint256 private constant VALID_TIMESTAMP_OFFSET = 20;
    uint256 private constant SIGNATURE_OFFSET = 84;
    uint256 private constant POST_OP_GAS = 35000;

    // ===========================================
    // State Variables
    // ===========================================

    /// @notice The ERC-4337 EntryPoint contract
    IEntryPoint public immutable entryPoint;

    /// @notice Signer address for validating sponsored operations
    address public verifyingSigner;

    /// @notice Gas usage tracking per user (for rate limiting)
    mapping(address => uint256) public gasUsedByUser;

    /// @notice Daily gas limit per user
    uint256 public dailyGasLimitPerUser;

    /// @notice Last reset timestamp for gas tracking
    mapping(address => uint256) public lastGasResetTime;

    /// @notice Whitelisted contracts that can be called with sponsorship
    mapping(address => bool) public whitelistedTargets;

    /// @notice Total gas sponsored
    uint256 public totalGasSponsored;

    /// @notice Whether sponsorship is paused
    bool public paused;

    // ===========================================
    // Events
    // ===========================================

    event GasSponsored(
        address indexed user,
        uint256 gasUsed,
        bytes32 userOpHash
    );

    event SignerChanged(address indexed oldSigner, address indexed newSigner);
    event DailyLimitChanged(uint256 oldLimit, uint256 newLimit);
    event TargetWhitelisted(address indexed target, bool whitelisted);
    event Paused(bool isPaused);
    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    // ===========================================
    // Errors
    // ===========================================

    error OnlyEntryPoint();
    error InvalidSignature();
    error DailyLimitExceeded();
    error TargetNotWhitelisted();
    error PaymasterPaused();
    error InsufficientDeposit();

    // ===========================================
    // Modifiers
    // ===========================================

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert OnlyEntryPoint();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert PaymasterPaused();
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================

    constructor(
        IEntryPoint _entryPoint,
        address _verifyingSigner,
        uint256 _dailyGasLimit
    ) Ownable(msg.sender) {
        entryPoint = _entryPoint;
        verifyingSigner = _verifyingSigner;
        dailyGasLimitPerUser = _dailyGasLimit;
    }


    // ===========================================
    // Paymaster Interface Implementation
    // ===========================================

    /**
     * @notice Validate a paymaster user operation
     * @param userOp The user operation
     * @param userOpHash Hash of the user operation
     * @param maxCost Maximum cost the paymaster will pay
     * @return context Context for postOp
     * @return validationData Validation result
     */
    function validatePaymasterUserOp(
        IEntryPoint.PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    )
        external
        onlyEntryPoint
        whenNotPaused
        returns (bytes memory context, uint256 validationData)
    {
        // Check deposit
        if (entryPoint.balanceOf(address(this)) < maxCost) {
            revert InsufficientDeposit();
        }

        // Parse paymasterAndData
        (
            uint48 validUntil,
            uint48 validAfter,
            bytes memory signature
        ) = _parsePaymasterData(userOp.paymasterAndData);

        // Validate signature
        bytes32 hash = _getHash(userOp, validUntil, validAfter);
        address recovered = hash.toEthSignedMessageHash().recover(signature);

        if (recovered != verifyingSigner) {
            return ("", _packValidationData(true, validUntil, validAfter));
        }

        // Check rate limiting
        _checkAndUpdateGasLimit(userOp.sender, maxCost);

        // Return context for postOp
        context = abi.encode(userOp.sender, maxCost, userOpHash);
        validationData = _packValidationData(false, validUntil, validAfter);
    }

    /**
     * @notice Post-operation handler
     * @param mode Post-op mode (0 = success, 1 = revert, 2 = postOp revert)
     * @param context Context from validatePaymasterUserOp
     * @param actualGasCost Actual gas cost of the operation
     * @param actualUserOpFeePerGas Actual fee per gas
     */
    function postOp(
        uint8 mode,
        bytes calldata context,
        uint256 actualGasCost,
        uint256 actualUserOpFeePerGas
    ) external onlyEntryPoint {
        (address user, , bytes32 userOpHash) = abi.decode(
            context,
            (address, uint256, bytes32)
        );

        // Update gas tracking
        gasUsedByUser[user] += actualGasCost;
        totalGasSponsored += actualGasCost;

        emit GasSponsored(user, actualGasCost, userOpHash);
    }

    // ===========================================
    // Internal Functions
    // ===========================================

    function _parsePaymasterData(
        bytes calldata paymasterAndData
    )
        internal
        pure
        returns (uint48 validUntil, uint48 validAfter, bytes memory signature)
    {
        // paymasterAndData format:
        // [0:20] paymaster address
        // [20:26] validUntil (6 bytes)
        // [26:32] validAfter (6 bytes)
        // [32:] signature

        validUntil = uint48(bytes6(paymasterAndData[VALID_TIMESTAMP_OFFSET:VALID_TIMESTAMP_OFFSET + 6]));
        validAfter = uint48(bytes6(paymasterAndData[VALID_TIMESTAMP_OFFSET + 6:VALID_TIMESTAMP_OFFSET + 12]));
        signature = paymasterAndData[VALID_TIMESTAMP_OFFSET + 12:];
    }

    function _getHash(
        IEntryPoint.PackedUserOperation calldata userOp,
        uint48 validUntil,
        uint48 validAfter
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    userOp.sender,
                    userOp.nonce,
                    keccak256(userOp.initCode),
                    keccak256(userOp.callData),
                    userOp.accountGasLimits,
                    userOp.preVerificationGas,
                    userOp.gasFees,
                    block.chainid,
                    address(this),
                    validUntil,
                    validAfter
                )
            );
    }

    function _checkAndUpdateGasLimit(
        address user,
        uint256 gasAmount
    ) internal {
        // Reset daily limit if 24 hours passed
        if (block.timestamp - lastGasResetTime[user] >= 1 days) {
            gasUsedByUser[user] = 0;
            lastGasResetTime[user] = block.timestamp;
        }

        // Check limit
        if (gasUsedByUser[user] + gasAmount > dailyGasLimitPerUser) {
            revert DailyLimitExceeded();
        }
    }

    function _packValidationData(
        bool sigFailed,
        uint48 validUntil,
        uint48 validAfter
    ) internal pure returns (uint256) {
        return
            (sigFailed ? 1 : 0) |
            (uint256(validUntil) << 160) |
            (uint256(validAfter) << (160 + 48));
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    function setSigner(address _signer) external onlyOwner {
        address oldSigner = verifyingSigner;
        verifyingSigner = _signer;
        emit SignerChanged(oldSigner, _signer);
    }

    function setDailyGasLimit(uint256 _limit) external onlyOwner {
        uint256 oldLimit = dailyGasLimitPerUser;
        dailyGasLimitPerUser = _limit;
        emit DailyLimitChanged(oldLimit, _limit);
    }

    function setWhitelistedTarget(
        address target,
        bool whitelisted
    ) external onlyOwner {
        whitelistedTargets[target] = whitelisted;
        emit TargetWhitelisted(target, whitelisted);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    // ===========================================
    // Deposit Management
    // ===========================================

    function deposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
        emit Deposited(msg.sender, msg.value);
    }

    function withdrawTo(
        address payable to,
        uint256 amount
    ) external onlyOwner {
        entryPoint.withdrawTo(to, amount);
        emit Withdrawn(to, amount);
    }

    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    // ===========================================
    // View Functions
    // ===========================================

    function getRemainingDailyGas(address user) external view returns (uint256) {
        if (block.timestamp - lastGasResetTime[user] >= 1 days) {
            return dailyGasLimitPerUser;
        }
        if (gasUsedByUser[user] >= dailyGasLimitPerUser) {
            return 0;
        }
        return dailyGasLimitPerUser - gasUsedByUser[user];
    }

    receive() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
        emit Deposited(msg.sender, msg.value);
    }
}
