# Stay Liquid Risk Engine Client

This repository provides a lightweight client for interacting with Stay Liquid's Risk Engine API. It's designed for simple deployment on any cloud server (e.g. DigitalOcean, AWS, etc.) using Docker.

---

## 🚀 Quickstart (Local Docker Setup)

1. **(if not installed) Install Docker and Docker Compose**

```bash
# Update package list and install prerequisites
apt-get update
apt-get install -y ca-certificates curl gnupg

# Add Docker’s official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Docker Compose plugin
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker
```

2. **Verify Docker installation**

```bash
docker --version
docker compose version
```

3. **Clone the repository**

```bash
git clone https://github.com/stayliquid/risk-engine-client.git
cd risk-engine-client
```

4. **Set up environment**

```bash
cp .env.example .env
vim .env  # Fill in your values
```

5. **Run in the background**

```bash
sudo chmod +x ./start.sh
./start.sh
```

6. **Verify it's working**

```bash
sudo chmod +x ./logs.sh
./logs.sh
```

7. **(after Stay Liquid linked your domain with your server IP)**

```bash
curl http://<your-company-name>.risk-api.stayliquidweb.site/is-healthy # should return {"status":true}
```

You can now access your service at `http://your-droplet-ip:3000`

> Tip: Use Nginx + Certbot for domain + HTTPS if needed. Ask us for the setup script.

---

## Sync with latest changes

1. **Login to your server**

2. **Go to the repository**

```bash
cd risk-engine-client
```

3. **Git pull and restart Docker process**

```bash
sudo chmod +x ./restart.sh # only to run once
./restart.sh
```

---

## 🔧 Configuration

The app reads environment variables from a `.env` file. See `.env.example` for full list.

### Required

- `COMPANY_NAME` - Your company name lowercased and dashed (e.g., "stay-liquid")
- `PRIVATE_KEY` – Your portfolio’s main wallet private key. **Note**: The wallet must have [USDC on Arbitrum](https://arbiscan.io/token/0xaf88d065e77c8cc2239327c5edb3a432268e5831).
- `RISK_API_KEY` – Your unique organization API key for Stay Liquid’s Risk API. If you don’t have one, request it from our team.
- `PORTFOLIO_ID` – The ID of the portfolio you’ll be creating. Can be any dashed string (e.g., "main-portfolio").
- `SERVER_URL` – URL or IP address of the server where this code is running (e.g., `1.1.1.1`, `http://1.1.1.1`, or `https://yourdomain.com`)

### Optional (with defaults)

Check `.env.example` file to see the full config.

---

For questions or API access, reach out to the Stay Liquid team at [support@stayliquid.co](mailto:support@stayliquid.co).
