require("dotenv").config();
const axios = require("axios");
const ethers = require("ethers");
const chalk = require("chalk");
const { apiUrl, portfolio, rpcUrl } = require("./config");

const checkEnvVariables = () => {
  const requiredEnvVars = ["PRIVATE_KEY", "RISK_API_KEY"];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar])
      throw new Error(`Missing required environment variable: ${envVar}`);
  });
};

const retryWithBackoff = async (fn, retries = 5, delay = 1000, factor = 2) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      const wait = delay * Math.pow(factor, attempt - 1);
      console.log(
        chalk.yellow(`Retrying in ${wait}ms (attempt ${attempt}/${retries})...`)
      );
      await new Promise((res) => setTimeout(res, wait));
    }
  }
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

const isPortfolioHealthy = async (apiUrl, portfolio) => {
  try {
    checkEnvVariables();
    const wallet = await loadWallet();
    const myPortfolio = { ...portfolio, walletAddr: wallet.address };

    const existingPortfolios = await getExistingPortfolios(apiUrl);
    if (existingPortfolios.status === false) return false;

    // 2. Find match
    const matchedPortfolio = findExistingMatchingPortfolio(
      existingPortfolios.res.portfolios,
      myPortfolio
    );
    if (!matchedPortfolio) return false;

    return matchedPortfolio.isActive !== false;
  } catch (err) {
    return false;
  }
};

const submitSignedTx = async (signedTx) => {
  try {
    const response = await axios.post(
      `${apiUrl}/portfolio/submit-signed-transaction`,
      { signedTx },
      {
        headers: { Authorization: process.env.RISK_API_KEY },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error submitting signed transaction:", error);
    throw error;
  }
};

const executePayload = async (chainId, to, data, value) => {
  try {
    const wallet = await loadWallet();
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Estimate gas limit
    const gasLimit = await provider.estimateGas({
      from: wallet.address,
      to,
      data,
      value,
    });
    // Fetch gas fees
    const feeData = await provider.getFeeData();
    const { maxFeePerGas, maxPriorityFeePerGas } = feeData;

    const tx = {
      from: wallet.address,
      to,
      data,
      value,
      chainId,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    const signedTx = await wallet.signTransaction(tx);

    // Submit the signed transaction
    const result = await submitSignedTx(signedTx);
    return result;
  } catch (error) {
    console.error("Error executing payload:", error);
    throw error;
  }
};

const executeAll = async (allocations) => {
  //
  // Execute approve payloads first
  //
  const apprExecRes = new Map(); // Map<beefyId, boolean>

  const approvePayloads = allocations.filter(
    (a) => a.payload.type === "tokenApprove"
  );

  for await (const approve of approvePayloads) {
    const { chainId, to, data, value } = approve.payload;
    const beefyId = approve.beefyId;
    const txType = approve.payload.type;

    try {
      const res = await executePayload(chainId, to, data, value);
      if (!res || !res.status)
        throw new Error("Execution failed or returned no status:", res);

      apprExecRes.set(beefyId, true);

      console.log(
        `Approve payload executed successfully for ${beefyId}: ${res}`
      );
    } catch (error) {
      apprExecRes.set(beefyId, false);
      console.error(`Failed to execute approve payload for ${beefyId}:`, error);
    }
  }
  console.log({ apprExecRes });

  //
  // After approves are successfully executed, proceed with the pool actions
  //
  const poolExecRes = new Map(); // Map<beefyId, boolean>
  const poolActionPayloads = allocations.filter(
    (a) => a.payload.type === "poolAction"
  );
  for await (const poolAction of poolActionPayloads) {
    const { chainId, to, data, value } = poolAction.payload;
    const beefyId = poolAction.beefyId;

    // Check if approve was successful for this beefyId
    if (apprExecRes.get(beefyId)) {
      try {
        const res = await executePayload(chainId, to, data, value);
        if (!res || !res.status)
          throw new Error("Execution failed or returned no status:", res);

        poolExecRes.set(beefyId, true);

        console.log(
          `Pool action payload executed successfully for ${beefyId}: ${res}`
        );
      } catch (error) {
        poolExecRes.set(beefyId, false);
        console.error(
          `Failed to execute pool action payload for ${beefyId}:`,
          error
        );
      }
    }
  }

  console.log({ apprExecRes, poolExecRes });
};

const main = async () => {
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
    throw error;
  }
};

const bootstrap = () => retryWithBackoff(main, 5, 1000, 2);

module.exports = { bootstrap, isPortfolioHealthy, executeAll };
