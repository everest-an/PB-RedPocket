/**
 * @fileoverview Deployment Script
 * @description Deploy all contracts to supported chains
 */

import { ethers } from "hardhat";

interface DeploymentConfig {
  chainId: number;
  name: string;
  entryPoint: string;
  signers: string[];
  threshold: number;
  upgradeDelay: number;
}

// Deployment configurations per chain
const deploymentConfigs: Record<number, DeploymentConfig> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    signers: [], // Set before deployment
    threshold: 2,
    upgradeDelay: 48 * 60 * 60, // 48 hours
  },
  137: {
    chainId: 137,
    name: "Polygon",
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    signers: [],
    threshold: 2,
    upgradeDelay: 24 * 60 * 60, // 24 hours
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    signers: [],
    threshold: 2,
    upgradeDelay: 24 * 60 * 60,
  },
  31337: {
    chainId: 31337,
    name: "Hardhat Local",
    entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    signers: [],
    threshold: 2,
    upgradeDelay: 60 * 60, // 1 hour for testing
  },
};

interface DeploymentResult {
  chainId: number;
  contracts: {
    proxyAdmin: string;
    accountFactory: string;
    accountFactoryProxy: string;
    paymaster: string;
    paymasterProxy: string;
    tokenVault: string;
    tokenVaultProxy: string;
    redPocket: string;
    redPocketProxy: string;
  };
  timestamp: number;
}

async function main() {
  const [deployer, signer1, signer2] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("=".repeat(60));
  console.log("Protocol Bank RedPocket - Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Chain ID: ${chainId}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  // Get config for current chain
  const config = deploymentConfigs[chainId];
  if (!config) {
    throw new Error(`No deployment config for chain ${chainId}`);
  }

  // Set signers for local testing
  if (chainId === 31337) {
    config.signers = [signer1.address, signer2.address];
  }

  if (config.signers.length < 2) {
    throw new Error("At least 2 signers required");
  }

  const result: DeploymentResult = {
    chainId,
    contracts: {} as DeploymentResult["contracts"],
    timestamp: Date.now(),
  };

  // 1. Deploy ProxyAdmin
  console.log("\n1. Deploying ProxyAdmin...");
  const ProxyAdmin = await ethers.getContractFactory("ProxyAdmin");
  const proxyAdmin = await ProxyAdmin.deploy(
    config.signers,
    config.threshold,
    config.upgradeDelay
  );
  await proxyAdmin.waitForDeployment();
  result.contracts.proxyAdmin = await proxyAdmin.getAddress();
  console.log(`   ProxyAdmin: ${result.contracts.proxyAdmin}`);

  // 2. Deploy SimpleAccountFactory (implementation)
  console.log("\n2. Deploying SimpleAccountFactory...");
  const SimpleAccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
  const accountFactory = await SimpleAccountFactory.deploy(config.entryPoint);
  await accountFactory.waitForDeployment();
  result.contracts.accountFactory = await accountFactory.getAddress();
  console.log(`   Implementation: ${result.contracts.accountFactory}`);

  // Deploy proxy for AccountFactory
  const TransparentUpgradeableProxy = await ethers.getContractFactory("TransparentUpgradeableProxy");
  const accountFactoryProxy = await TransparentUpgradeableProxy.deploy(
    result.contracts.accountFactory,
    result.contracts.proxyAdmin,
    "0x"
  );
  await accountFactoryProxy.waitForDeployment();
  result.contracts.accountFactoryProxy = await accountFactoryProxy.getAddress();
  console.log(`   Proxy: ${result.contracts.accountFactoryProxy}`);

  // 3. Deploy Paymaster (implementation)
  console.log("\n3. Deploying Paymaster...");
  const Paymaster = await ethers.getContractFactory("Paymaster");
  const paymaster = await Paymaster.deploy(config.entryPoint, deployer.address);
  await paymaster.waitForDeployment();
  result.contracts.paymaster = await paymaster.getAddress();
  console.log(`   Implementation: ${result.contracts.paymaster}`);

  // Deploy proxy for Paymaster
  const paymasterProxy = await TransparentUpgradeableProxy.deploy(
    result.contracts.paymaster,
    result.contracts.proxyAdmin,
    "0x"
  );
  await paymasterProxy.waitForDeployment();
  result.contracts.paymasterProxy = await paymasterProxy.getAddress();
  console.log(`   Proxy: ${result.contracts.paymasterProxy}`);

  // 4. Deploy TokenVault (implementation)
  console.log("\n4. Deploying TokenVault...");
  const TokenVault = await ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.waitForDeployment();
  result.contracts.tokenVault = await tokenVault.getAddress();
  console.log(`   Implementation: ${result.contracts.tokenVault}`);

  // Deploy proxy for TokenVault
  const tokenVaultProxy = await TransparentUpgradeableProxy.deploy(
    result.contracts.tokenVault,
    result.contracts.proxyAdmin,
    "0x"
  );
  await tokenVaultProxy.waitForDeployment();
  result.contracts.tokenVaultProxy = await tokenVaultProxy.getAddress();
  console.log(`   Proxy: ${result.contracts.tokenVaultProxy}`);

  // 5. Deploy RedPocket (implementation)
  console.log("\n5. Deploying RedPocket...");
  const RedPocket = await ethers.getContractFactory("RedPocket");
  const redPocket = await RedPocket.deploy();
  await redPocket.waitForDeployment();
  result.contracts.redPocket = await redPocket.getAddress();
  console.log(`   Implementation: ${result.contracts.redPocket}`);

  // Deploy proxy for RedPocket
  const redPocketProxy = await TransparentUpgradeableProxy.deploy(
    result.contracts.redPocket,
    result.contracts.proxyAdmin,
    "0x"
  );
  await redPocketProxy.waitForDeployment();
  result.contracts.redPocketProxy = await redPocketProxy.getAddress();
  console.log(`   Proxy: ${result.contracts.redPocketProxy}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));
  console.log(JSON.stringify(result, null, 2));

  return result;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
