// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IEntryPoint.sol";

/**
 * @title IAccount
 * @notice ERC-4337 Account interface
 * @dev Interface that all ERC-4337 compatible accounts must implement
 */
interface IAccount {
    /**
     * @notice Validate a UserOperation
     * @param userOp The UserOperation to validate
     * @param userOpHash Hash of the UserOperation (excluding signature)
     * @param missingAccountFunds Amount of funds missing from the account's deposit
     * @return validationData Packed validation data:
     *         - 0 for valid signature
     *         - 1 for invalid signature
     *         - Otherwise, packed (authorizer, validUntil, validAfter)
     */
    function validateUserOp(
        IEntryPoint.PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}
