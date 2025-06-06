const express = require("express");
const bodyParser = require("body-parser");
const { createHash } = require("crypto");
const { bootstrap, isPortfolioHealthy, executeAll } = require("./index");
const { apiUrl, portfolio } = require("./config");

const app = express();
app.use(bodyParser.json());

let isWebhookExecuting = false;

app.get("/is-healthy", async (req, res) => {
  const isHealthy = await isPortfolioHealthy(apiUrl, portfolio);
  console.log("Health check result:", isHealthy);
  if (isHealthy) {
    res.status(200).json({ status: true });
  } else {
    res.status(500).json({ status: false });
  }
});

app.post("/webhook-target", async (req, res) => {
  const apiKey = process.env.RISK_API_KEY;
  const authHeader = req.headers.authorization;
  const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");
  console.log({ authHeader, apiKeyHash });

  if (!authHeader || authHeader !== `Bearer ${apiKeyHash}`) {
    console.log("Unauthorized webhook attempt. Header:", authHeader);
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }
  console.log("Received webhook:", req.body);

  if (isWebhookExecuting) {
    return res
      .status(429)
      .json({ error: "Processing in progress. Try again later." });
  }
  isWebhookExecuting = true;

  // Sign and submit the payload
  try {
    const { body } = req;
    console.log({ body });
    const { event, allocations } = req.body;
    if (!event || !allocations) {
      return res.status(400).json({
        error: "Missing 'event', or 'allocations' in request body",
      });
    }
    if (event !== "rebalance") {
      return res.status(400).json({ error: "Unsupported event type" });
    }
    await executeAll(allocations);
    return res.status(200).json({ status: true });
  } catch (error) {
    console.error("🔥 Error executing payload:", error.message);
    return res.status(500).json({ status: false, error: error.message });
  } finally {
    isWebhookExecuting = false;
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await bootstrap();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup logic failed:", error);
    process.exit(1);
  }
})();
