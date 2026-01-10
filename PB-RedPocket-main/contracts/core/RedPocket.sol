// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RedPocket
 * @notice RedPocket distribution contract with lucky draw and expiration features
 * @dev Supports ETH and ERC20 tokens with anti-fraud protection
 */
contract RedPocket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ===========================================
    // Constants
    // ===========================================

    address public constant ETH_ADDRESS = address(0);
    uint256 public constant MIN_EXPIRY_DURATION = 1 hours;
    uint256 public constant MAX_EXPIRY_DURATION = 365 days;

    // ===========================================
    // State Variables
    // ===========================================

    /// @notice RedPocket counter for unique IDs
    uint256 public pocketCounter;

    /// @notice All RedPockets
    mapping(uint256 => PocketInfo) public pockets;

    /// @notice Claim records: pocketId => claimer => claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    /// @notice Social ID claim records: pocketId => socialIdHash => claimed
    mapping(uint256 => mapping(bytes32 => bool)) public socialIdClaimed;

    /// @notice Authorized operators
    mapping(address => bool) public operators;

    /// @notice Random seed for lucky draw
    uint256 private _randomSeed;

    // ===========================================
    // Structs
    // ===========================================

    struct PocketInfo {
        address creator;
        address token;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 totalCount;
        uint256 claimedCount;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 expiresAt;
        bool isLuckyDraw;
        bool isActive;
        string platform;
        string channelId;
    }

    struct ClaimResult {
        uint256 pocketId;
        address claimer;
        uint256 amount;
        uint256 timestamp;
    }

    // ===========================================
    // Events
    // ===========================================

    event PocketCreated(
        uint256 indexed pocketId,
        address indexed creator,
        address token,
        uint256 totalAmount,
        uint256 totalCount,
        bool isLuckyDraw,
        uint256 expiresAt
    );

    event PocketClaimed(
        uint256 indexed pocketId,
        address indexed claimer,
        bytes32 indexed socialIdHash,
        uint256 amount
    );

    event PocketExpired(
        uint256 indexed pocketId,
        uint256 refundedAmount,
        address indexed refundTo
    );

    event OperatorUpdated(address indexed operator, bool status);


    // ===========================================
    // Errors
    // ===========================================

    error InvalidAmount();
    error InvalidCount();
    error InvalidExpiry();
    error InvalidBounds();
    error PocketNotFound();
    error PocketExpiredError();
    error PocketNotExpired();
    error PocketInactive();
    error AlreadyClaimed();
    error PocketEmpty();
    error NotOperator();
    error TransferFailed();
    error Unauthorized();

    // ===========================================
    // Modifiers
    // ===========================================

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != owner()) revert NotOperator();
        _;
    }

    // ===========================================
    // Constructor
    // ===========================================

    constructor() Ownable(msg.sender) {
        _randomSeed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender)));
    }

    // ===========================================
    // Create Functions
    // ===========================================

    /// @notice Create a new RedPocket with ETH
    /// @param totalCount Number of recipients
    /// @param isLuckyDraw Whether amounts are randomized
    /// @param minAmount Minimum amount per claim (for lucky draw)
    /// @param maxAmount Maximum amount per claim (for lucky draw)
    /// @param expiresAt Expiration timestamp
    /// @param platform Social platform identifier
    /// @param channelId Platform channel/group ID
    function createETHPocket(
        uint256 totalCount,
        bool isLuckyDraw,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 expiresAt,
        string calldata platform,
        string calldata channelId
    ) external payable returns (uint256 pocketId) {
        if (msg.value == 0) revert InvalidAmount();
        if (totalCount == 0) revert InvalidCount();
        
        _validateExpiry(expiresAt);
        _validateBounds(msg.value, totalCount, isLuckyDraw, minAmount, maxAmount);

        pocketId = ++pocketCounter;
        
        pockets[pocketId] = PocketInfo({
            creator: msg.sender,
            token: ETH_ADDRESS,
            totalAmount: msg.value,
            remainingAmount: msg.value,
            totalCount: totalCount,
            claimedCount: 0,
            minAmount: minAmount,
            maxAmount: maxAmount,
            expiresAt: expiresAt,
            isLuckyDraw: isLuckyDraw,
            isActive: true,
            platform: platform,
            channelId: channelId
        });

        emit PocketCreated(pocketId, msg.sender, ETH_ADDRESS, msg.value, totalCount, isLuckyDraw, expiresAt);
    }

    /// @notice Create a new RedPocket with ERC20 tokens
    function createTokenPocket(
        address token,
        uint256 amount,
        uint256 totalCount,
        bool isLuckyDraw,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 expiresAt,
        string calldata platform,
        string calldata channelId
    ) external returns (uint256 pocketId) {
        if (token == ETH_ADDRESS) revert InvalidAmount();
        if (amount == 0) revert InvalidAmount();
        if (totalCount == 0) revert InvalidCount();
        
        _validateExpiry(expiresAt);
        _validateBounds(amount, totalCount, isLuckyDraw, minAmount, maxAmount);

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        pocketId = ++pocketCounter;
        
        pockets[pocketId] = PocketInfo({
            creator: msg.sender,
            token: token,
            totalAmount: amount,
            remainingAmount: amount,
            totalCount: totalCount,
            claimedCount: 0,
            minAmount: minAmount,
            maxAmount: maxAmount,
            expiresAt: expiresAt,
            isLuckyDraw: isLuckyDraw,
            isActive: true,
            platform: platform,
            channelId: channelId
        });

        emit PocketCreated(pocketId, msg.sender, token, amount, totalCount, isLuckyDraw, expiresAt);
    }

    // ===========================================
    // Claim Functions
    // ===========================================

    /// @notice Claim from a RedPocket (operator-only for gasless claims)
    /// @param pocketId The RedPocket ID
    /// @param claimer The claimer's wallet address
    /// @param socialIdHash Hash of the claimer's social ID
    function claim(
        uint256 pocketId,
        address claimer,
        bytes32 socialIdHash
    ) external onlyOperator nonReentrant returns (uint256 amount) {
        PocketInfo storage pocket = pockets[pocketId];
        
        if (!pocket.isActive) revert PocketInactive();
        if (pocket.remainingAmount == 0) revert PocketEmpty();
        if (pocket.claimedCount >= pocket.totalCount) revert PocketEmpty();
        if (block.timestamp >= pocket.expiresAt) revert PocketExpiredError();
        
        // Anti-fraud: Check both wallet and social ID
        if (hasClaimed[pocketId][claimer]) revert AlreadyClaimed();
        if (socialIdClaimed[pocketId][socialIdHash]) revert AlreadyClaimed();

        // Calculate claim amount
        amount = _calculateClaimAmount(pocket);
        
        // Update state
        pocket.remainingAmount -= amount;
        pocket.claimedCount++;
        hasClaimed[pocketId][claimer] = true;
        socialIdClaimed[pocketId][socialIdHash] = true;

        // Transfer funds
        _transfer(pocket.token, claimer, amount);

        emit PocketClaimed(pocketId, claimer, socialIdHash, amount);
    }

    /// @notice Direct claim (user pays gas)
    /// @param pocketId The RedPocket ID
    /// @param socialIdHash Hash of the claimer's social ID
    function claimDirect(
        uint256 pocketId,
        bytes32 socialIdHash
    ) external nonReentrant returns (uint256 amount) {
        PocketInfo storage pocket = pockets[pocketId];
        
        if (!pocket.isActive) revert PocketInactive();
        if (pocket.remainingAmount == 0) revert PocketEmpty();
        if (pocket.claimedCount >= pocket.totalCount) revert PocketEmpty();
        if (block.timestamp >= pocket.expiresAt) revert PocketExpiredError();
        
        // Anti-fraud checks
        if (hasClaimed[pocketId][msg.sender]) revert AlreadyClaimed();
        if (socialIdClaimed[pocketId][socialIdHash]) revert AlreadyClaimed();

        // Calculate claim amount
        amount = _calculateClaimAmount(pocket);
        
        // Update state
        pocket.remainingAmount -= amount;
        pocket.claimedCount++;
        hasClaimed[pocketId][msg.sender] = true;
        socialIdClaimed[pocketId][socialIdHash] = true;

        // Transfer funds
        _transfer(pocket.token, msg.sender, amount);

        emit PocketClaimed(pocketId, msg.sender, socialIdHash, amount);
    }

    // ===========================================
    // Expiration Functions
    // ===========================================

    /// @notice Recover funds from expired RedPocket
    /// @param pocketId The RedPocket ID
    function recoverExpired(uint256 pocketId) external nonReentrant {
        PocketInfo storage pocket = pockets[pocketId];
        
        if (!pocket.isActive) revert PocketInactive();
        if (block.timestamp < pocket.expiresAt) revert PocketNotExpired();
        if (pocket.remainingAmount == 0) revert PocketEmpty();

        uint256 refundAmount = pocket.remainingAmount;
        address refundTo = pocket.creator;
        
        pocket.remainingAmount = 0;
        pocket.isActive = false;

        _transfer(pocket.token, refundTo, refundAmount);

        emit PocketExpired(pocketId, refundAmount, refundTo);
    }

    // ===========================================
    // Internal Functions
    // ===========================================

    function _validateExpiry(uint256 expiresAt) internal view {
        if (expiresAt <= block.timestamp + MIN_EXPIRY_DURATION) revert InvalidExpiry();
        if (expiresAt > block.timestamp + MAX_EXPIRY_DURATION) revert InvalidExpiry();
    }

    function _validateBounds(
        uint256 totalAmount,
        uint256 totalCount,
        bool isLuckyDraw,
        uint256 minAmount,
        uint256 maxAmount
    ) internal pure {
        if (isLuckyDraw) {
            if (minAmount == 0 || maxAmount == 0) revert InvalidBounds();
            if (minAmount > maxAmount) revert InvalidBounds();
            if (minAmount * totalCount > totalAmount) revert InvalidBounds();
            if (maxAmount * totalCount < totalAmount) revert InvalidBounds();
        } else {
            // Fixed amount: must be evenly divisible
            if (totalAmount % totalCount != 0) revert InvalidAmount();
        }
    }

    function _calculateClaimAmount(PocketInfo storage pocket) internal returns (uint256) {
        uint256 remainingCount = pocket.totalCount - pocket.claimedCount;
        
        if (!pocket.isLuckyDraw) {
            // Fixed amount distribution
            return pocket.remainingAmount / remainingCount;
        }

        // Lucky draw: random amount within bounds
        if (remainingCount == 1) {
            // Last claim gets remaining amount
            return pocket.remainingAmount;
        }

        // Generate random amount within bounds
        _randomSeed = uint256(keccak256(abi.encodePacked(_randomSeed, block.timestamp, block.prevrandao)));
        
        // Calculate safe bounds for this claim
        uint256 minForThis = pocket.minAmount;
        uint256 maxForThis = pocket.remainingAmount - (pocket.minAmount * (remainingCount - 1));
        
        if (maxForThis > pocket.maxAmount) {
            maxForThis = pocket.maxAmount;
        }
        
        if (minForThis > maxForThis) {
            return minForThis;
        }

        uint256 range = maxForThis - minForThis + 1;
        return minForThis + (_randomSeed % range);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (token == ETH_ADDRESS) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // ===========================================
    // Admin Functions
    // ===========================================

    function setOperator(address operator, bool status) external onlyOwner {
        operators[operator] = status;
        emit OperatorUpdated(operator, status);
    }

    /// @notice Emergency deactivate a pocket
    function deactivatePocket(uint256 pocketId) external onlyOwner {
        pockets[pocketId].isActive = false;
    }

    // ===========================================
    // View Functions
    // ===========================================

    function getPocket(uint256 pocketId) external view returns (
        address creator,
        address token,
        uint256 totalAmount,
        uint256 remainingAmount,
        uint256 totalCount,
        uint256 claimedCount,
        uint256 expiresAt,
        bool isLuckyDraw,
        bool isActive
    ) {
        PocketInfo storage pocket = pockets[pocketId];
        return (
            pocket.creator,
            pocket.token,
            pocket.totalAmount,
            pocket.remainingAmount,
            pocket.totalCount,
            pocket.claimedCount,
            pocket.expiresAt,
            pocket.isLuckyDraw,
            pocket.isActive
        );
    }

    function canClaim(uint256 pocketId, address claimer, bytes32 socialIdHash) external view returns (bool) {
        PocketInfo storage pocket = pockets[pocketId];
        
        if (!pocket.isActive) return false;
        if (pocket.remainingAmount == 0) return false;
        if (pocket.claimedCount >= pocket.totalCount) return false;
        if (block.timestamp >= pocket.expiresAt) return false;
        if (hasClaimed[pocketId][claimer]) return false;
        if (socialIdClaimed[pocketId][socialIdHash]) return false;
        
        return true;
    }

    function isExpired(uint256 pocketId) external view returns (bool) {
        return block.timestamp >= pockets[pocketId].expiresAt;
    }
}
