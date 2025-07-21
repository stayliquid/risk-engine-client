require("dotenv").config();
const axios = require("axios");
const ethers = require("ethers");
const chalk = require("chalk");
const { apiUrl, portfolio, rpcUrl } = require("./config");

const normalizeUrl = (input) =>
  /^https?:\/\//i.test(input) ? input : `http://${input}`;

const checkEnvVariables = () => {
  const requiredEnvVars = ["PRIVATE_KEY", "RISK_API_KEY"];
  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar])
      throw new Error(`Missing required environment variable: ${envVar}`);
  });
};

const getAuthHeader = () => ({
  headers: { Authorization: `Bearer ${process.env.RISK_API_KEY}` },
});

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
      rebalanceWebhookUrl: new URL(
        "/webhook-target",
        normalizeUrl(portfolio.serverUrl)
      ).toString(),
      minNumPositions: portfolio.minNumPositions,
      maxNumPositions: portfolio.maxNumPositions,
      initialAmountInUSD: portfolio.initialAmountInUSD,
      walletAddr: portfolio.walletAddr,
      mainAssetAddr: portfolio.mainAssetAddr,
    };
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined)
    );
    console.log(
      chalk.cyan.bold("📊 Creating portfolio with parameters:"),
      "\n",
      chalk.magenta("Parameters:"),
      cleanParams
    );

    const query = new URLSearchParams(cleanParams).toString();
    const response = await axios.post(
      `${apiUrl}/portfolio/create?${query}`,
      {},
      getAuthHeader()
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create portfolio:", error.response?.data || error);
    throw error;
  }
};

const getExistingPortfolios = async (apiUrl) => {
  try {
    const response = await axios.get(
      `${apiUrl}/portfolio/my-portfolios`,
      getAuthHeader()
    );
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
      getAuthHeader()
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

const findExistingMatchingPortfolio = (existingPortfolios, newPortfolio) =>
  existingPortfolios.find((p) => p.id === newPortfolio.portfolioId);

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
    const submitRes = await axios.post(
      `${apiUrl}/portfolio/submit-signed-transaction`,
      { signedTx },
      getAuthHeader()
    );
    return submitRes.data;
  } catch (error) {
    console.error("Error submitting signed transaction:", error);
    throw error;
  }
};

const executePayload = async (chainId, to, data, value) => {
  try {
    const wallet = await loadWallet();
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Get current nonce
    const nonce = await provider.getTransactionCount(wallet.address, "pending");

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
      nonce,
    };
    const signedTx = await wallet.signTransaction(tx);

    // Submit the signed transaction
    console.log("Submitting signed transaction...");
    const result = await submitSignedTx(signedTx);
    console.log({ result });
    return result;
  } catch (error) {
    console.error("Error executing payload:", error);
    throw error;
  }
};

const executePayloadWithLogging = async (payload, beefyId, status) => {
  try {
    const res = await executePayload(
      payload.chainId,
      payload.to,
      payload.data,
      payload.value
    );
    if (!res?.status) throw res?.error || res;
    console.log(
      chalk.green.bold(
        `✅ ${payload.type} success for ${chalk.blue(
          beefyId
        )} (status: ${chalk.yellow(status)})`
      ),
      res
    );
    return { ok: true, payloadType: payload.type };
  } catch (error) {
    console.error(
      chalk.red.bold(
        `❌ ${payload.type} error for ${chalk.blue(
          beefyId
        )} (status: ${chalk.yellow(status)})`
      ),
      error
    );
    return { ok: false, payloadType: payload.type };
  }
};

const executeAll = async (allocations) => {
  // Sort allocations: tokenApproveJoin/Exit first, then poolExit, then poolJoin
  allocations.sort((a, b) => {
    const order = {
      tokenApproveExit: 1,
      tokenApproveJoin: 1,
      poolExit: 2,
      poolJoin: 3,
    };
    return (order[a.payload.type] || 4) - (order[b.payload.type] || 4);
  });

  // Group by beefyId
  const grouped = {};
  for (const allocation of allocations) {
    const id = allocation.beefyId;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push({
      ...allocation.payload,
      originalStatus: allocation.status,
    });
  }

  // Now exits will be executed first, then joins

  const summary = {};

  for (const [beefyId, payloads] of Object.entries(grouped)) {
    // Always show status of pool (from allocations.status)
    const status = payloads[0].originalStatus || "unknown";
    console.log(
      chalk.cyan.bold(
        `\n🔄 Executing payloads for Beefy ID: ${beefyId} (status: ${status})`
      )
    );
    summary[beefyId] = {};

    // Approve first if present
    const approve = payloads.find(
      (p) => p.type === "tokenApproveJoin" || p.type === "tokenApproveExit"
    );
    if (approve) {
      const approveRes = await executePayloadWithLogging(
        approve,
        beefyId,
        status
      );
      summary[beefyId]["tokenApprove"] = approveRes.ok ? "success" : "failed";
      if (!approveRes.ok) continue; // skip poolAction if approve failed
    }

    // Pool action second if present
    const poolAction = payloads.find(
      (p) => p.type === "poolJoin" || p.type === "poolExit"
    );
    if (poolAction) {
      const poolActionRes = await executePayloadWithLogging(
        poolAction,
        beefyId,
        status
      );
      summary[beefyId]["poolAction"] = poolActionRes.ok ? "success" : "failed";
      await new Promise((res) => setTimeout(res, 5000)); // wait 5 second before next action to allow RPC to index the tx
    }
  }

  // ---- Summary Section ----
  console.log(chalk.magenta.bold("\n===== EXECUTION SUMMARY ====="));
  for (const [beefyId, results] of Object.entries(summary)) {
    // Find status from allocations (the first one for this beefyId)
    const poolStatus =
      (allocations.find((a) => a.beefyId === beefyId) || {}).status ||
      "unknown";
    console.log(
      chalk.blue.bold(
        `\nBeefy ID: ${beefyId} (status: ${chalk.yellow(poolStatus)})`
      )
    );
    for (const [txType, result] of Object.entries(results)) {
      const color = result === "success" ? chalk.green : chalk.red;
      console.log(color(`   ${txType}: ${result.toUpperCase()}`));
    }
  }
  console.log(chalk.magenta.bold("===== END OF SUMMARY =====\n"));
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
    // console.log({ existingPortfolios: existingPortfolios.res.portfolios });

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
