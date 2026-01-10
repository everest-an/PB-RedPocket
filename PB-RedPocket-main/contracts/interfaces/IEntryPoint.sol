// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEntryPoint
 * @notice ERC-4337 EntryPoint interface (v0.7)
 * @dev Simplified interface for Protocol Bank integration
 */
interface IEntryPoint {
    struct PackedUserOperation {
        address sender;
        uint256 nonce;
        bytes initCode;
        bytes callData;
        bytes32 accountGasLimits;
        uint256 preVerificationGas;
        bytes32 gasFees;
        bytes paymasterAndData;
        bytes signature;
    }

    struct UserOpsPerAggregator {
        PackedUserOperation[] userOps;
        address aggregator;
        bytes signature;
    }

    function handleOps(
        PackedUserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    function handleAggregatedOps(
        UserOpsPerAggregator[] calldata opsPerAggregator,
        address payable beneficiary
    ) external;

    function getUserOpHash(
        PackedUserOperation calldata userOp
    ) external view returns (bytes32);

    function getNonce(
        address sender,
        uint192 key
    ) external view returns (uint256 nonce);

    function depositTo(address account) external payable;

    function balanceOf(address account) external view returns (uint256);

    function withdrawTo(
        address payable withdrawAddress,
        uint256 withdrawAmount
    ) external;
}
