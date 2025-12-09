import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting RemitEscrow deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString(), "\n");

  // Price feed address for Celo Alfajores (cUSD/USD)
  // For testnet, we use ZeroAddress - update for mainnet deployment
  const priceFeedAddress = ethers.ZeroAddress;

  console.log("Deploying RemitEscrow contract...");
  console.log("Price Feed Address:", priceFeedAddress === ethers.ZeroAddress ? "None (testnet)" : priceFeedAddress, "\n");

  // Deploy RemitEscrow contract
  const RemitEscrow = await ethers.getContractFactory("RemitEscrow");
  const remitEscrow = await RemitEscrow.deploy(priceFeedAddress);

  await remitEscrow.waitForDeployment();

  const contractAddress = await remitEscrow.getAddress();
  console.log("RemitEscrow deployed to:", contractAddress);

  // Get deployment transaction details
  const deploymentTx = remitEscrow.deploymentTransaction();
  if (deploymentTx) {
    console.log("Transaction hash:", deploymentTx.hash);
    console.log("Block number:", deploymentTx.blockNumber, "\n");
  }

  // Verify initial contract state
  console.log("Verifying contract state...");
  const owner = await remitEscrow.owner();
  const platformFee = await remitEscrow.platformFeeBps();
  const feeCollector = await remitEscrow.feeCollector();

  console.log("Owner:", owner);
  console.log("Platform Fee (bps):", platformFee.toString());
  console.log("Fee Collector:", feeCollector, "\n");

  // Create deployment info for frontend
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: deploymentTx?.hash || "",
    owner: owner,
    platformFeeBps: platformFee.toString(),
    priceFeed: priceFeedAddress,
  };

  // Save deployment info to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${network.chainId}.json`
  );

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to:", deploymentFile, "\n");

  console.log("=".repeat(50));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log("\nNext steps:");
  console.log("1. Update frontend/.env with:");
  console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`   VITE_CHAIN_ID=${network.chainId}`);
  console.log("\n2. Verify contract on Celoscan:");
  console.log(`   npx hardhat verify --network ${network.name} ${contractAddress} "${priceFeedAddress}"`);
  console.log("\n3. Test contract functions before frontend integration");
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
