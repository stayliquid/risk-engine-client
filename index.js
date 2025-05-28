require("dotenv").config();
const axios = require("axios");
const ethers = require("ethers");
const chalk = require("chalk");

const checkEnvVariables = () => {
  const requiredEnvVars = ["PRIVATE_KEY", "RISK_API_KEY"];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar])
      throw new Error(`Missing required environment variable: ${envVar}`);
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
      {
        headers: { Authorization: process.env.RISK_API_KEY },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create portfolio:", error.response?.data || error);
    throw error;
  }
};

const getExistingPortfolios = async (apiUrl) => {
  try {
    const response = await axios.get(`${apiUrl}/portfolio/my-portfolios`, {
      headers: { Authorization: process.env.RISK_API_KEY },
    });
    return response.data;
  } catch (error) {
    console.error(
      "Failed to fetch existing portfolios:",
      error.response?.data || error
    );
    throw error;
  }
};

const activatePortfolio = async (apiUrl, portfolioId) => {
  try {
    const query = new URLSearchParams({ portfolioId }).toString();
    const response = await axios.post(
      `${apiUrl}/portfolio/activate?${query}`,
      {},
      {
        headers: { Authorization: process.env.RISK_API_KEY },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "Failed to activate portfolio:",
      error.response?.data || error
    );
    throw error;
  }
};

const findExistingMatchingPortfolio = (existingPortfolios, newPortfolio) => {
  return existingPortfolios.find(
    (p) => p.id === newPortfolio.portfolioId && p.orgId === newPortfolio.orgId
  );
};

const main = async () => {
  const apiUrl = "http://localhost:3999";
  const portfolio = {
    portfolioId: "main-portfolio",
    orgId: "risk-api-client",
    name: "Main Portfolio",
    chainId: 42161,
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
      chalk.cyan.bold("🔑 Wallet address derived from private key:"),
      chalk.green(portfolio.walletAddr)
    );

    // Step 1: Check for existing portfolio
    console.log(chalk.yellow.bold("\n🔎 Step 1: Check for existing portfolio"));
    const existingPortfolios = await getExistingPortfolios(apiUrl);
    if (existingPortfolios.status === false) {
      console.error(
        chalk.red.bold("❌ Failed to fetch existing portfolios:"),
        existingPortfolios.error
      );
      return;
    }

    const matchedPortfolio = findExistingMatchingPortfolio(
      existingPortfolios.res.portfolios,
      portfolio
    );
    if (matchedPortfolio) {
      console.log(
        chalk.green.bold(
          "✅ Portfolio with identical parameters already exists!"
        ),
        "\n",
        chalk.magenta("Parameters:"),
        matchedPortfolio
      );
    } else {
      // Create the portfolio if not found
      console.log(chalk.yellow.bold("\n🚀 Step 2: Create the portfolio"));
      const result = await createPortfolio(apiUrl, portfolio);
      if (result.status) {
        console.log(
          chalk.green.bold("✅ Portfolio created successfully!"),
          "\n",
          chalk.magenta("Parameters:"),
          result.res
        );
      } else {
        console.error(
          chalk.red.bold("❌ Failed to create portfolio:"),
          result.error
        );
        return;
      }
    }

    // Step 3: Activate the portfolio (whether it was newly created or already existed)
    console.log(chalk.yellow.bold("\n⚡ Step 3: Activate the portfolio"));
    const activationResult = await activatePortfolio(
      apiUrl,
      portfolio.portfolioId
    );
    if (activationResult.status) {
      console.log(
        chalk.green.bold("✅ Portfolio activated successfully!"),
        "\n",
        chalk.magenta("Result:"),
        activationResult.res
      );
    } else {
      console.error(
        chalk.red.bold("❌ Failed to activate portfolio:"),
        activationResult.error
      );
    }
  } catch (error) {
    console.error(
      chalk.red.bold("🔥 Error: Failed to create portfolio:"),
      error.message
    );
  }
};

main();
