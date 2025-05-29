FROM node:23-alpine-slim
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
CMD ["node", "src/server.js"]