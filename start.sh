git pull # Pull the latest changes from the repository
export $(grep COMPANY_NAME .env); sed -i "s/YOUR_COMPANY_NAME_LOWERCASED/${COMPANY_NAME}/g" caddyfile # Update Caddyfile with company name
docker compose up --build -d # Build and start the containers (Caddy and the app)