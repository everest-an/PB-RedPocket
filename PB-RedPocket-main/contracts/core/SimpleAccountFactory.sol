// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./SimpleAccount.sol";

/**
 * @title SimpleAccountFactory
 * @notice Factory contract for creating ERC-4337 smart accounts
 * @dev Uses CREATE2 for deterministic address generation based on social identity
 */
contract SimpleAccountFactory {
    // ===========================================
    // State Variables
    // ===========================================

    /// @notice The SimpleAccount implementation contract
    SimpleAccount public immutable accountImplementation;

    /// @notice Mapping of social identity hash to deployed account address
    mapping(bytes32 => address) public socialIdToAccount;

    // ===========================================
    // Events
    // ===========================================

    event AccountCreated(
        address indexed account,
        address indexed owner,
        string platform,
        string socialId,
        bytes32 salt
    );

    // ===========================================
    // Constructor
    // ===========================================

    /// @notice Deploy the factory with a new SimpleAccount implementation
    /// @param _entryPoint The ERC-4337 EntryPoint address
    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint);
    }

    // ===========================================
    // Account Creation
    // ===========================================

    /// @notice Create a new account or return existing one
    /// @param owner The owner address for the account
    /// @param platform Social platform identifier (e.g., "telegram")
    /// @param socialId Social platform user ID
    /// @return account The account address (existing or newly created)
    function createAccount(
        address owner,
        string calldata platform,
        string calldata socialId
    ) external returns (SimpleAccount account) {
        bytes32 salt = _getSalt(platform, socialId);
        address addr = getAddress(owner, platform, socialId);

        // Check if account already exists
        if (addr.code.length > 0) {
            return SimpleAccount(payable(addr));
        }

        // Deploy new account using CREATE2
        account = SimpleAccount(
            payable(
                new ERC1967Proxy{salt: salt}(
                    address(accountImplementation),
                    abi.encodeCall(
                        SimpleAccount.initialize,
                        (owner, platform, socialId)
                    )
                )
            )
        );

        // Store mapping
        socialIdToAccount[salt] = address(account);

        emit AccountCreated(address(account), owner, platform, socialId, salt);
    }

    // ===========================================
    // Address Computation (Counterfactual)
    // ===========================================

    /// @notice Compute the counterfactual address for an account
    /// @dev This address is deterministic and can be computed before deployment
    /// @param owner The owner address
    /// @param platform Social platform identifier
    /// @param socialId Social platform user ID
    /// @return The computed account address
    function getAddress(
        address owner,
        string calldata platform,
        string calldata socialId
    ) public view returns (address) {
        bytes32 salt = _getSalt(platform, socialId);

        return
            Create2.computeAddress(
                salt,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountImplementation),
                            abi.encodeCall(
                                SimpleAccount.initialize,
                                (owner, platform, socialId)
                            )
                        )
                    )
                )
            );
    }

    /// @notice Get account address by social identity only
    /// @dev Useful when owner is not known yet (pre-claim scenario)
    /// @param platform Social platform identifier
    /// @param socialId Social platform user ID
    /// @return The stored account address (zero if not created)
    function getAccountBySocialId(
        string calldata platform,
        string calldata socialId
    ) external view returns (address) {
        bytes32 salt = _getSalt(platform, socialId);
        return socialIdToAccount[salt];
    }

    /// @notice Check if an account exists for a social identity
    /// @param platform Social platform identifier
    /// @param socialId Social platform user ID
    /// @return True if account exists
    function accountExists(
        string calldata platform,
        string calldata socialId
    ) external view returns (bool) {
        bytes32 salt = _getSalt(platform, socialId);
        address account = socialIdToAccount[salt];
        return account != address(0) && account.code.length > 0;
    }

    // ===========================================
    // Internal Functions
    // ===========================================

    /// @dev Generate salt from platform and social ID
    function _getSalt(
        string calldata platform,
        string calldata socialId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(platform, ":", socialId));
    }
}
