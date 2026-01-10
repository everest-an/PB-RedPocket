// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TransparentUpgradeableProxy.sol";

/**
 * @title ProxyAdmin
 * @notice Admin contract for managing proxy upgrades with multi-sig support
 * @dev Implements timelock and multi-signature for secure upgrades
 */
contract ProxyAdmin {
    // State variables
    address public owner;
    address[] public signers;
    uint256 public threshold;
    uint256 public upgradeDelay;
    
    // Pending upgrade
    struct PendingUpgrade {
        address proxy;
        address newImplementation;
        bytes data;
        uint256 scheduledAt;
        uint256 approvals;
        mapping(address => bool) hasApproved;
        bool executed;
        bool cancelled;
    }
    
    mapping(bytes32 => PendingUpgrade) public pendingUpgrades;
    bytes32[] public upgradeIds;
    
    // Events
    event UpgradeScheduled(
        bytes32 indexed upgradeId,
        address indexed proxy,
        address indexed newImplementation,
        uint256 scheduledAt,
        uint256 executeAfter
    );
    event UpgradeApproved(bytes32 indexed upgradeId, address indexed signer);
    event UpgradeExecuted(bytes32 indexed upgradeId, address indexed proxy, address indexed newImplementation);
    event UpgradeCancelled(bytes32 indexed upgradeId);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlySigner() {
        require(_isSigner(msg.sender), "Not signer");
        _;
    }

    /**
     * @notice Initialize ProxyAdmin
     * @param _signers Initial signers
     * @param _threshold Required approvals
     * @param _upgradeDelay Timelock delay in seconds
     */
    constructor(
        address[] memory _signers,
        uint256 _threshold,
        uint256 _upgradeDelay
    ) {
        require(_signers.length >= 2, "Min 2 signers");
        require(_threshold >= 1 && _threshold <= _signers.length, "Invalid threshold");
        require(_upgradeDelay >= 1 hours, "Min 1 hour delay");
        
        owner = msg.sender;
        signers = _signers;
        threshold = _threshold;
        upgradeDelay = _upgradeDelay;
    }

    /**
     * @notice Schedule an upgrade
     * @param proxy Proxy contract address
     * @param newImplementation New implementation address
     * @param data Optional initialization data
     * @return upgradeId Unique upgrade identifier
     */
    function scheduleUpgrade(
        address proxy,
        address newImplementation,
        bytes calldata data
    ) external onlySigner returns (bytes32 upgradeId) {
        require(proxy != address(0), "Invalid proxy");
        require(newImplementation != address(0), "Invalid implementation");
        
        upgradeId = keccak256(abi.encodePacked(
            proxy,
            newImplementation,
            data,
            block.timestamp
        ));
        
        require(pendingUpgrades[upgradeId].scheduledAt == 0, "Already scheduled");
        
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        upgrade.proxy = proxy;
        upgrade.newImplementation = newImplementation;
        upgrade.data = data;
        upgrade.scheduledAt = block.timestamp;
        upgrade.approvals = 1;
        upgrade.hasApproved[msg.sender] = true;
        
        upgradeIds.push(upgradeId);
        
        emit UpgradeScheduled(
            upgradeId,
            proxy,
            newImplementation,
            block.timestamp,
            block.timestamp + upgradeDelay
        );
        emit UpgradeApproved(upgradeId, msg.sender);
        
        return upgradeId;
    }

    /**
     * @notice Approve a pending upgrade
     * @param upgradeId Upgrade identifier
     */
    function approveUpgrade(bytes32 upgradeId) external onlySigner {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        
        require(upgrade.scheduledAt > 0, "Not scheduled");
        require(!upgrade.executed, "Already executed");
        require(!upgrade.cancelled, "Cancelled");
        require(!upgrade.hasApproved[msg.sender], "Already approved");
        
        upgrade.hasApproved[msg.sender] = true;
        upgrade.approvals++;
        
        emit UpgradeApproved(upgradeId, msg.sender);
    }

    /**
     * @notice Execute an approved upgrade after timelock
     * @param upgradeId Upgrade identifier
     */
    function executeUpgrade(bytes32 upgradeId) external onlySigner {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        
        require(upgrade.scheduledAt > 0, "Not scheduled");
        require(!upgrade.executed, "Already executed");
        require(!upgrade.cancelled, "Cancelled");
        require(upgrade.approvals >= threshold, "Insufficient approvals");
        require(
            block.timestamp >= upgrade.scheduledAt + upgradeDelay,
            "Timelock not expired"
        );
        
        upgrade.executed = true;
        
        // Execute upgrade
        if (upgrade.data.length > 0) {
            TransparentUpgradeableProxy(payable(upgrade.proxy))
                .upgradeToAndCall(upgrade.newImplementation, upgrade.data);
        } else {
            TransparentUpgradeableProxy(payable(upgrade.proxy))
                .upgradeTo(upgrade.newImplementation);
        }
        
        emit UpgradeExecuted(upgradeId, upgrade.proxy, upgrade.newImplementation);
    }

    /**
     * @notice Cancel a pending upgrade
     * @param upgradeId Upgrade identifier
     */
    function cancelUpgrade(bytes32 upgradeId) external onlyOwner {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        
        require(upgrade.scheduledAt > 0, "Not scheduled");
        require(!upgrade.executed, "Already executed");
        require(!upgrade.cancelled, "Already cancelled");
        
        upgrade.cancelled = true;
        
        emit UpgradeCancelled(upgradeId);
    }


    // ==========================================================================
    // Signer Management
    // ==========================================================================

    /**
     * @notice Add a new signer
     * @param signer New signer address
     */
    function addSigner(address signer) external onlyOwner {
        require(signer != address(0), "Invalid signer");
        require(!_isSigner(signer), "Already signer");
        
        signers.push(signer);
        emit SignerAdded(signer);
    }

    /**
     * @notice Remove a signer
     * @param signer Signer to remove
     */
    function removeSigner(address signer) external onlyOwner {
        require(_isSigner(signer), "Not signer");
        require(signers.length - 1 >= threshold, "Would violate threshold");
        require(signers.length > 2, "Min 2 signers");
        
        // Find and remove signer
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == signer) {
                signers[i] = signers[signers.length - 1];
                signers.pop();
                break;
            }
        }
        
        emit SignerRemoved(signer);
    }

    /**
     * @notice Update approval threshold
     * @param newThreshold New threshold value
     */
    function updateThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold >= 1 && newThreshold <= signers.length, "Invalid threshold");
        
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Transfer ownership
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // ==========================================================================
    // View Functions
    // ==========================================================================

    /**
     * @notice Get all signers
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @notice Get pending upgrade details
     */
    function getUpgrade(bytes32 upgradeId) external view returns (
        address proxy,
        address newImplementation,
        uint256 scheduledAt,
        uint256 approvals,
        bool executed,
        bool cancelled
    ) {
        PendingUpgrade storage upgrade = pendingUpgrades[upgradeId];
        return (
            upgrade.proxy,
            upgrade.newImplementation,
            upgrade.scheduledAt,
            upgrade.approvals,
            upgrade.executed,
            upgrade.cancelled
        );
    }

    /**
     * @notice Check if address is signer
     */
    function isSigner(address account) external view returns (bool) {
        return _isSigner(account);
    }

    /**
     * @notice Check if signer has approved upgrade
     */
    function hasApproved(bytes32 upgradeId, address signer) external view returns (bool) {
        return pendingUpgrades[upgradeId].hasApproved[signer];
    }

    /**
     * @notice Get number of pending upgrades
     */
    function getPendingUpgradeCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < upgradeIds.length; i++) {
            PendingUpgrade storage upgrade = pendingUpgrades[upgradeIds[i]];
            if (!upgrade.executed && !upgrade.cancelled) {
                count++;
            }
        }
        return count;
    }

    // Internal functions
    function _isSigner(address account) internal view returns (bool) {
        for (uint256 i = 0; i < signers.length; i++) {
            if (signers[i] == account) {
                return true;
            }
        }
        return false;
    }
}
