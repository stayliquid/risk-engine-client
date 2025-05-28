require("dotenv").config();

const axios = require("axios");
const ethers = require("ethers");

const checkEnvVariables = () => {
  const requiredEnvVars = ["PRIVATE_KEY", "RISK_API_KEY"];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });
};

const loadWallet = async () => {
  try {
    return new ethers.Wallet(process.env.PRIVATE_KEY);
  } catch (error) {
    console.error("Error loading wallet:", error);
    throw error;
  }
};

const createPortfolio = async (apiUrl, portfolio) => {
  try {
    const params = {
      portfolioId: portfolio.portfolioId,
      orgId: portfolio.orgId,
      name: portfolio.name,
      chainId: portfolio.chainId,
      maxRiskScore: portfolio.maxRiskScore,
      rebalanceFrequencyHours: portfolio.rebalanceFrequencyHours,
      rebalanceWebhookUrl: portfolio.rebalanceWebhookUrl,
      minNumPositions: portfolio.minNumPositions,
      maxNumPositions: portfolio.maxNumPositions,
      initialAmountInUSD: portfolio.initialAmountInUSD,
      walletAddr: portfolio.walletAddr,
      mainAssetAddr: portfolio.mainAssetAddr,
    };
    const query = new URLSearchParams(params).toString();
    const response = await axios.post(
      `${apiUrl}/portfolio/create?${query}`,
      {},
      { headers: { Authorization: process.env.RISK_API_KEY } }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create portfolio:", error.response?.data || error);
    throw error;
  }
};

const main = async () => {
  const apiUrl = "http://localhost:3999";
  const portfolio = {
    portfolioId: "main-portfolio",
    orgId: "risk-api-client",
    name: "Main Portfolio",
    chainId: 42161, // Arbitrum
    maxRiskScore: 3.75,
    rebalanceFrequencyHours: 1,
    rebalanceWebhookUrl: "https://risk-api-client.vercel.app/webhook-target",
    minNumPositions: 3,
    maxNumPositions: 3,
    initialAmountInUSD: 10,
    // walletAddr: '<will be derived from private key>',
    mainAssetAddr: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  };

  try {
    checkEnvVariables();

    const wallet = await loadWallet();
    portfolio.walletAddr = wallet.address;
    console.log(
      `Wallet address derived from private key: ${portfolio.walletAddr}`
    );

    const result = await createPortfolio(apiUrl, portfolio);
    if (result.status) {
      console.log(
        "Portfolio created successfully with the following parameters:",
        result.res
      );
    } else {
      console.error("Failed to create portfolio:", result.error);
    }
  } catch (error) {
    console.error("Failed to create portfolio:", error.message);
  }
};

main();
