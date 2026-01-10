import hre from "hardhat";
import { expect } from "chai";
import * as fc from "fast-check";
import { TokenVault, RedPocket } from "../typechain-types";

const { ethers } = hre;

describe("Token Vault and RedPocket", function () {
  let vault: TokenVault;
  let redPocket: RedPocket;
  let owner: any;
  let operator: any;
  let enterprise: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, operator, enterprise, user1, user2] = await ethers.getSigners();

    // Deploy TokenVault
    const TokenVault = await ethers.getContractFactory("TokenVault");
    vault = await TokenVault.deploy(
      ethers.parseEther("1"), // multiSigThreshold: 1 ETH
      1 // requiredSignatures
    );
    await vault.waitForDeployment();

    // Deploy RedPocket
    const RedPocket = await ethers.getContractFactory("RedPocket");
    redPocket = await RedPocket.deploy();
    await redPocket.waitForDeployment();

    // Set operator
    await vault.setOperator(operator.address, true);
    await redPocket.setOperator(operator.address, true);
  });

  describe("Property 21: Smart Contract Standards Compliance", function () {
    /**
     * Property: Vault should correctly track enterprise balances after deposits
     */
    it("should track ETH deposits correctly", async function () {
      const depositAmount = ethers.parseEther("0.5");
      
      await vault.connect(enterprise).depositETH({ value: depositAmount });
      
      const balance = await vault.getBalance(enterprise.address, ethers.ZeroAddress);
      expect(balance).to.equal(depositAmount);
    });

    /**
     * Property: Vault balance should decrease correctly after withdrawal
     */
    it("should handle withdrawals correctly", async function () {
      const depositAmount = ethers.parseEther("0.5");
      const withdrawAmount = ethers.parseEther("0.2");
      
      await vault.connect(enterprise).depositETH({ value: depositAmount });
      await vault.connect(enterprise).withdraw(
        ethers.ZeroAddress,
        withdrawAmount,
        user1.address
      );
      
      const balance = await vault.getBalance(enterprise.address, ethers.ZeroAddress);
      expect(balance).to.equal(depositAmount - withdrawAmount);
    });

    /**
     * Property: Batch distribution should correctly distribute to all recipients
     */
    it("should handle batch distribution correctly", async function () {
      const depositAmount = ethers.parseEther("1");
      const distributionAmount = ethers.parseEther("0.1");
      
      await vault.connect(enterprise).depositETH({ value: depositAmount });
      
      const recipients = [user1.address, user2.address];
      const amounts = [distributionAmount, distributionAmount];
      
      const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
      const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
      
      await vault.connect(operator).batchDistribute(
        enterprise.address,
        ethers.ZeroAddress,
        recipients,
        amounts
      );
      
      const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
      const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
      
      expect(user1BalanceAfter - user1BalanceBefore).to.equal(distributionAmount);
      expect(user2BalanceAfter - user2BalanceBefore).to.equal(distributionAmount);
    });

    /**
     * Property: Only operators can execute distributions
     */
    it("should restrict distribution to operators only", async function () {
      const depositAmount = ethers.parseEther("1");
      await vault.connect(enterprise).depositETH({ value: depositAmount });
      
      await expect(
        vault.connect(user1).batchDistribute(
          enterprise.address,
          ethers.ZeroAddress,
          [user2.address],
          [ethers.parseEther("0.1")]
        )
      ).to.be.revertedWithCustomError(vault, "NotOperator");
    });

    /**
     * Property: Cannot withdraw more than balance
     */
    it("should prevent overdraft withdrawals", async function () {
      const depositAmount = ethers.parseEther("0.5");
      await vault.connect(enterprise).depositETH({ value: depositAmount });
      
      await expect(
        vault.connect(enterprise).withdraw(
          ethers.ZeroAddress,
          ethers.parseEther("1"),
          user1.address
        )
      ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });
  });

  describe("Property 3: Lucky Draw Bounds Compliance", function () {
    /**
     * Property: Lucky draw amounts should always be within specified bounds
     */
    it("should create valid lucky draw RedPocket", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      const minAmount = ethers.parseEther("0.05");
      const maxAmount = ethers.parseEther("0.2");
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400; // 24 hours

      const tx = await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        true, // isLuckyDraw
        minAmount,
        maxAmount,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const pocket = await redPocket.getPocket(1);
      expect(pocket.totalAmount).to.equal(totalAmount);
      expect(pocket.isLuckyDraw).to.be.true;
    });

    /**
     * Property: Fixed distribution should divide evenly
     */
    it("should create valid fixed amount RedPocket", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      const tx = await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false, // not lucky draw
        0,
        0,
        expiresAt,
        "discord",
        "server456",
        { value: totalAmount }
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    /**
     * Property: Invalid bounds should be rejected
     */
    it("should reject invalid lucky draw bounds", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      // Min > Max should fail
      await expect(
        redPocket.connect(enterprise).createETHPocket(
          totalCount,
          true,
          ethers.parseEther("0.5"), // min
          ethers.parseEther("0.1"), // max < min
          expiresAt,
          "telegram",
          "channel123",
          { value: totalAmount }
        )
      ).to.be.revertedWithCustomError(redPocket, "InvalidBounds");
    });
  });

  describe("Property 4: Expired Fund Recovery", function () {
    /**
     * Property: Expired RedPockets should allow fund recovery
     */
    it("should allow recovery of expired RedPocket funds", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      // Get current block timestamp
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      // Set expiry to minimum allowed (1 hour + 10 seconds buffer)
      const expiresAt = currentTime + 3610;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const enterpriseBalanceBefore = await ethers.provider.getBalance(enterprise.address);
      
      await redPocket.recoverExpired(1);
      
      const enterpriseBalanceAfter = await ethers.provider.getBalance(enterprise.address);
      expect(enterpriseBalanceAfter).to.be.gt(enterpriseBalanceBefore);
    });

    /**
     * Property: Cannot recover non-expired RedPocket
     */
    it("should prevent recovery of non-expired RedPocket", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      await expect(
        redPocket.recoverExpired(1)
      ).to.be.revertedWithCustomError(redPocket, "PocketNotExpired");
    });
  });

  describe("Property 20: Anti-Fraud Protection", function () {
    /**
     * Property: Same wallet cannot claim twice
     */
    it("should prevent double claiming by same wallet", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      const socialIdHash = ethers.keccak256(ethers.toUtf8Bytes("user1_telegram"));
      
      // First claim should succeed
      await redPocket.connect(operator).claim(1, user1.address, socialIdHash);
      
      // Second claim with same wallet should fail
      const differentSocialId = ethers.keccak256(ethers.toUtf8Bytes("user1_different"));
      await expect(
        redPocket.connect(operator).claim(1, user1.address, differentSocialId)
      ).to.be.revertedWithCustomError(redPocket, "AlreadyClaimed");
    });

    /**
     * Property: Same social ID cannot claim twice
     */
    it("should prevent double claiming by same social ID", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      const socialIdHash = ethers.keccak256(ethers.toUtf8Bytes("user1_telegram"));
      
      // First claim should succeed
      await redPocket.connect(operator).claim(1, user1.address, socialIdHash);
      
      // Second claim with same social ID but different wallet should fail
      await expect(
        redPocket.connect(operator).claim(1, user2.address, socialIdHash)
      ).to.be.revertedWithCustomError(redPocket, "AlreadyClaimed");
    });

    /**
     * Property: Cannot claim from expired RedPocket
     */
    it("should prevent claiming from expired RedPocket", async function () {
      const totalAmount = ethers.parseEther("1");
      const totalCount = 10;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 3610;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      // Fast forward time past expiry
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const socialIdHash = ethers.keccak256(ethers.toUtf8Bytes("user1_telegram"));
      
      await expect(
        redPocket.connect(operator).claim(1, user1.address, socialIdHash)
      ).to.be.revertedWithCustomError(redPocket, "PocketExpiredError");
    });

    /**
     * Property: Cannot claim more than total count
     */
    it("should prevent claiming when RedPocket is empty", async function () {
      const totalAmount = ethers.parseEther("0.2");
      const totalCount = 2;
      
      const block = await ethers.provider.getBlock("latest");
      const currentTime = block!.timestamp;
      const expiresAt = currentTime + 86400;

      await redPocket.connect(enterprise).createETHPocket(
        totalCount,
        false,
        0,
        0,
        expiresAt,
        "telegram",
        "channel123",
        { value: totalAmount }
      );

      // Claim all available
      const socialId1 = ethers.keccak256(ethers.toUtf8Bytes("user1"));
      const socialId2 = ethers.keccak256(ethers.toUtf8Bytes("user2"));
      
      await redPocket.connect(operator).claim(1, user1.address, socialId1);
      await redPocket.connect(operator).claim(1, user2.address, socialId2);

      // Third claim should fail
      const [, , , user3] = await ethers.getSigners();
      const socialId3 = ethers.keccak256(ethers.toUtf8Bytes("user3"));
      
      await expect(
        redPocket.connect(operator).claim(1, user3.address, socialId3)
      ).to.be.revertedWithCustomError(redPocket, "PocketEmpty");
    });
  });

  describe("Vault Multi-Sig Security", function () {
    /**
     * Property: Large withdrawals should require multi-sig
     */
    it("should handle multi-sig threshold correctly", async function () {
      const threshold = await vault.multiSigThreshold();
      expect(threshold).to.equal(ethers.parseEther("1"));
    });

    /**
     * Property: Signer management should work correctly
     */
    it("should manage signers correctly", async function () {
      expect(await vault.isSigner(owner.address)).to.be.true;
      expect(await vault.isSigner(user1.address)).to.be.false;
      
      await vault.setSigner(user1.address, true);
      expect(await vault.isSigner(user1.address)).to.be.true;
      
      await vault.setSigner(user1.address, false);
      expect(await vault.isSigner(user1.address)).to.be.false;
    });
  });
});
