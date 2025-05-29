const express = require("express");
const bodyParser = require("body-parser");
const { bootstrap, isPortfolioHealthy } = require("./index");
const { apiUrl, portfolio } = require("./config");

const app = express();
app.use(bodyParser.json());

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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }
  console.log("Received webhook:", req.body);
  res.status(200).json({ received: req.body, ok: true });
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
