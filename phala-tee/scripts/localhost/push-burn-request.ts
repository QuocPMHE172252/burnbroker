import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
  const OracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");
  const [deployer] = await ethers.getSigners();

  const consumerSC = process.env["LOCALHOST_CONSUMER_CONTRACT_ADDRESS"] || "";
  if (!consumerSC) {
    console.error("Error: Please provide LOCALHOST_CONSUMER_CONTRACT_ADDRESS");
    process.exit(1);
  }

  const consumer = OracleConsumerContract.attach(consumerSC);

  const payload = JSON.stringify({
    apiKey: "sk-binance-test-abc123xyz789",
    strategy: "spot_trade_btc_usdt",
  });

  console.log("Pushing BurnBroker request...");
  console.log("Payload:", payload);
  await consumer.connect(deployer).request(payload);

  consumer.on("ResponseReceived", async (reqId: number, reqData: string, value: string) => {
    console.info("\n=== BURN COMPLETE ===");
    console.info("Received event [ResponseReceived]:", { reqId, reqData, value });
    console.info("The API key has been executed and destroyed inside the TEE.");
    process.exit();
  });

  consumer.on("ErrorReceived", async (reqId: number, reqData: string, errno: string) => {
    console.info("\nReceived event [ErrorReceived]:", { reqId, reqData, errno });
    process.exit();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
