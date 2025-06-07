# Stay Liquid Risk Engine Client

This repository provides a lightweight client for interacting with Stay Liquid's Risk Engine API. It's designed for simple deployment on any cloud server (e.g. DigitalOcean, AWS, etc.) using Docker.

---

## 🚀 Quickstart (Local Docker Setup)

1. **Clone the repository**

```bash
git clone https://github.com/stayliquid/risk-engine-client.git
cd risk-engine-client
```

1. **Set up your configuration**

Copy the example environment file and fill it in:

```bash
cp .env.example .env
nano .env
```

See the [Configuration](#-configuration) section for details on each environment variable.

3. **Run with Docker Compose**

```bash
docker compose up --build -d
```

The server will be available at: `http://localhost:3000` or the port defined in your `.env` file.

---

## 🌐 Deploy to DigitalOcean (1-Click)

1. **Create a new Droplet** on DigitalOcean with Docker pre-installed.

2. **SSH into the Droplet**

```bash
ssh root@your-droplet-ip
```

3. **Install Docker and Docker Compose**

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

4. **Verify Docker installation**

```bash
docker --version
docker compose version
```

5. **Clone the repository**

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
docker compose up --build -d
```

6. **Verify it's working**

```bash
docker logs -f $(docker ps -q)
```

You can now access your service at `http://your-droplet-ip:3000`

> Tip: Use Nginx + Certbot for domain + HTTPS if needed. Ask us for the setup script.

---

## 🔧 Configuration

The app reads environment variables from a `.env` file. See `.env.example` for full list.

### Required

- `PRIVATE_KEY` – Your portfolio’s main wallet private key. **Note**: The wallet must have [USDC on Arbitrum](https://arbiscan.io/token/0xaf88d065e77c8cc2239327c5edb3a432268e5831).
- `RISK_API_KEY` – Your unique organization API key for Stay Liquid’s Risk API. If you don’t have one, request it from our team.
- `PORTFOLIO_ID` – The ID of the portfolio you’ll be creating. Can be any string, dashes allowed (e.g., "main-portfolio").
- `SERVER_URL` – URL or IP address of the server where this code is running (e.g., `1.1.1.1`, `http://1.1.1.1`, or `https://yourdomain.com`)

### Optional (with defaults)

Check `.env.example` file to see the full config.

---

For questions or API access, reach out to the Stay Liquid team at [support@stayliquid.co](mailto:support@stayliquid.co).
