module.exports = {
  apiUrl: process.env.RISK_API_URL || "https://risk.api.stayliquid.co",
  rpcUrl: process.env.RPC_URL || "https://arb1.arbitrum.io/rpc",
  portfolio: {
    portfolioId: process.env.PORTFOLIO_ID,
    orgId: process.env.ORG_ID,
    name: process.env.PORTFOLIO_NAME || "Main Portfolio",
    chainId: Number(process.env.CHAIN_ID) || 42161, // Arbitrum One
    maxRiskScore: parseFloat(process.env.MAX_RISK_SCORE) || 3.75,
    rebalanceFrequencyHours:
      Number(process.env.REBALANCE_FREQUENCY_HOURS) || 24 * 7, // weekly
    serverUrl: process.env.SERVER_URL,
    minNumPositions: Number(process.env.MIN_NUM_POSITIONS) || 3,
    maxNumPositions: Number(process.env.MAX_NUM_POSITIONS) || 3,
    initialAmountInUSD: process.env.INITIAL_AMOUNT_IN_USD
      ? Number(process.env.INITIAL_AMOUNT_IN_USD)
      : undefined,
    mainAssetAddr:
      process.env.MAIN_ASSET_ADDR ||
      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum
  },
};
