# Stay Liquid Risk Engine Client

This repository provides a lightweight client for interacting with Stay Liquid's Risk Engine API. It's designed for simple deployment on any cloud server (e.g. DigitalOcean, AWS, etc.) using Docker.

---

## 🚀 Quickstart (Local Docker Setup)

1. **Clone the repository**

```bash
git clone https://github.com/stayliquid/risk-engine-client.git
cd risk-engine-client
```

2. **Set up your configuration**

Copy the example environment file and fill it in:

```bash
cp .env.example .env
nano .env
```

3. **Run with Docker Compose**

```bash
docker compose up --build
```

The server will be available at: `http://localhost:3000` or the port defined in your `.env` file.

---

## 🌐 Deploy to DigitalOcean (1-Click)

1. **Create a new Droplet** on DigitalOcean with Docker pre-installed.

2. **SSH into the Droplet**

```bash
ssh root@your-droplet-ip
```

3. **Clone the repository**

```bash
git clone https://github.com/stayliquid/risk-engine-client.git
cd risk-engine-client
```

4. **Set up environment**

```bash
cp .env.example .env
nano .env  # Fill in your values
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

- `PRIVATE_KEY` - Main wallet private key (must have USDC on Arbitrum)
- `RISK_API_KEY` – Your API key for Stay Liquid's Risk API (request from Stay Liquid team)
- `PORTFOLIO_ID` - ID of the portfolio you're creating (e.g., "main-portfolio")
- `INITIAL_AMOUNT_IN_USD` - Initial amount in USD to start the portfolio (number)
- `SERVER_URL` - URL or IP addresss of the current server where the code is running on

### Optional (with defaults)

Check `.env.example` file to see the full config.

---

## 📦 Docker Compose (for self-hosting)

```yaml
version: "3"
services:
  risk-engine-client:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: always
```

---

For questions or API access, reach out to the Stay Liquid team at [support@stayliquid.co](mailto:support@stayliquid.co).
