// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../interfaces/IEntryPoint.sol";
import "../interfaces/IAccount.sol";

/**
 * @title SimpleAccount
 * @notice ERC-4337 compatible smart account for Protocol Bank
 * @dev Implements minimal account abstraction with social identity binding
 */
contract SimpleAccount is IAccount, Initializable, UUPSUpgradeable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===========================================
    // State Variables
    // ===========================================

    /// @notice The ERC-4337 EntryPoint contract
    IEntryPoint public immutable entryPoint;

    /// @notice Owner of this account (can be EOA or another contract)
    address public owner;

    /// @notice Social platform identifier (e.g., "telegram", "discord")
    string public platform;

    /// @notice Social platform user ID
    string public socialId;

    /// @notice Nonce for replay protection (managed by EntryPoint)
    uint256 private _nonce;

    // ===========================================
    // Events
    // ===========================================

    event AccountInitialized(
        address indexed owner,
        string platform,
        string socialId
    );

    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    event Executed(
        address indexed target,
        uint256 value,
        bytes data,
        bool success
    );

    // ===========================================
    // Errors
    // ===========================================

    error OnlyOwner();
    error OnlyEntryPoint();
    error OnlyOwnerOrEntryPoint();
    error InvalidSignature();
    error ExecutionFailed();

    // ===========================================
    // Modifiers
    // ===========================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) revert OnlyEntryPoint();
        _;
    }

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != address(entryPoint)) {
            revert OnlyOwnerOrEntryPoint();
        }
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================

    /// @notice Constructor sets the EntryPoint (immutable)
    /// @param _entryPoint The ERC-4337 EntryPoint address
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _disableInitializers();
    }

    // ===========================================
    // Initialization
    // ===========================================

    /// @notice Initialize the account with owner and social identity
    /// @param _owner The owner address
    /// @param _platform Social platform identifier
    /// @param _socialId Social platform user ID
    function initialize(
        address _owner,
        string calldata _platform,
        string calldata _socialId
    ) external initializer {
        owner = _owner;
        platform = _platform;
        socialId = _socialId;
        emit AccountInitialized(_owner, _platform, _socialId);
    }

    // ===========================================
    // IAccount Implementation
    // ===========================================

    /// @inheritdoc IAccount
    function validateUserOp(
        IEntryPoint.PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        validationData = _validateSignature(userOp, userOpHash);
        _payPrefund(missingAccountFunds);
    }

    // ===========================================
    // Execution Functions
    // ===========================================

    /// @notice Execute a single transaction
    /// @param target Target contract address
    /// @param value ETH value to send
    /// @param data Call data
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyOwnerOrEntryPoint {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        emit Executed(target, value, data, success);
    }

    /// @notice Execute multiple transactions in batch
    /// @param targets Array of target addresses
    /// @param values Array of ETH values
    /// @param datas Array of call data
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrEntryPoint {
        require(
            targets.length == values.length && values.length == datas.length,
            "Length mismatch"
        );

        for (uint256 i = 0; i < targets.length; i++) {
            (bool success, bytes memory result) = targets[i].call{
                value: values[i]
            }(datas[i]);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            emit Executed(targets[i], values[i], datas[i], success);
        }
    }

    // ===========================================
    // Owner Management
    // ===========================================

    /// @notice Transfer ownership to a new address
    /// @param newOwner The new owner address
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerChanged(oldOwner, newOwner);
    }

    // ===========================================
    // Internal Functions
    // ===========================================

    /// @dev Validate the signature of a UserOperation
    function _validateSignature(
        IEntryPoint.PackedUserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);

        if (recovered != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }
        return 0; // SIG_VALIDATION_SUCCESS
    }

    /// @dev Pay the EntryPoint for gas
    function _payPrefund(uint256 missingAccountFunds) internal {
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(address(entryPoint)).call{
                value: missingAccountFunds
            }("");
            // Ignore failure (EntryPoint will handle it)
            (success);
        }
    }

    /// @dev Required for UUPS upgrades
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ===========================================
    // View Functions
    // ===========================================

    /// @notice Get the current nonce from EntryPoint
    function getNonce() public view returns (uint256) {
        return entryPoint.getNonce(address(this), 0);
    }

    /// @notice Get the deposit balance in EntryPoint
    function getDeposit() public view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    // ===========================================
    // Deposit Management
    // ===========================================

    /// @notice Add deposit to EntryPoint for gas
    function addDeposit() public payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    /// @notice Withdraw deposit from EntryPoint
    /// @param withdrawAddress Address to receive the withdrawal
    /// @param amount Amount to withdraw
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    // ===========================================
    // Receive ETH
    // ===========================================

    receive() external payable {}
}
