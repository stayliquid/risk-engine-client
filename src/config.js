module.exports = {
  apiUrl: "http://localhost:3999",
  portfolio: {
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
  },
};
