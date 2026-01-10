// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TransparentUpgradeableProxy
 * @notice Proxy contract for upgradeable smart contracts
 * @dev Implements EIP-1967 transparent proxy pattern
 */
contract TransparentUpgradeableProxy {
    // EIP-1967 storage slots
    bytes32 private constant IMPLEMENTATION_SLOT = 
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    bytes32 private constant ADMIN_SLOT = 
        bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

    // Events
    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @notice Initialize proxy with implementation and admin
     * @param _logic Initial implementation address
     * @param _admin Admin address
     * @param _data Initialization data
     */
    constructor(address _logic, address _admin, bytes memory _data) {
        require(_logic != address(0), "Invalid implementation");
        require(_admin != address(0), "Invalid admin");
        
        _setImplementation(_logic);
        _setAdmin(_admin);
        
        if (_data.length > 0) {
            (bool success,) = _logic.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    /**
     * @notice Fallback function delegates to implementation
     */
    fallback() external payable {
        _delegate(_getImplementation());
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {
        _delegate(_getImplementation());
    }

    /**
     * @notice Upgrade to new implementation (admin only)
     * @param newImplementation New implementation address
     */
    function upgradeTo(address newImplementation) external {
        require(msg.sender == _getAdmin(), "Not admin");
        require(newImplementation != address(0), "Invalid implementation");
        require(newImplementation != _getImplementation(), "Same implementation");
        
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }

    /**
     * @notice Upgrade and call initialization (admin only)
     * @param newImplementation New implementation address
     * @param data Initialization data
     */
    function upgradeToAndCall(address newImplementation, bytes memory data) external {
        require(msg.sender == _getAdmin(), "Not admin");
        require(newImplementation != address(0), "Invalid implementation");
        
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
        
        if (data.length > 0) {
            (bool success,) = newImplementation.delegatecall(data);
            require(success, "Call failed");
        }
    }

    /**
     * @notice Change admin (admin only)
     * @param newAdmin New admin address
     */
    function changeAdmin(address newAdmin) external {
        require(msg.sender == _getAdmin(), "Not admin");
        require(newAdmin != address(0), "Invalid admin");
        
        address previousAdmin = _getAdmin();
        _setAdmin(newAdmin);
        emit AdminChanged(previousAdmin, newAdmin);
    }

    /**
     * @notice Get current implementation
     */
    function implementation() external view returns (address) {
        require(msg.sender == _getAdmin(), "Not admin");
        return _getImplementation();
    }

    /**
     * @notice Get current admin
     */
    function admin() external view returns (address) {
        require(msg.sender == _getAdmin(), "Not admin");
        return _getAdmin();
    }

    // Internal functions
    function _delegate(address impl) internal {
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    function _getImplementation() internal view returns (address impl) {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    function _setImplementation(address newImplementation) internal {
        bytes32 slot = IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, newImplementation)
        }
    }

    function _getAdmin() internal view returns (address adm) {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            adm := sload(slot)
        }
    }

    function _setAdmin(address newAdmin) internal {
        bytes32 slot = ADMIN_SLOT;
        assembly {
            sstore(slot, newAdmin)
        }
    }
}
