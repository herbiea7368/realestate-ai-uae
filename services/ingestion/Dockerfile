FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm prune --omit=dev
USER node
ENV METRICS_ENABLED=true
EXPOSE 9103
HEALTHCHECK CMD wget -qO- http://localhost:9103/metrics || exit 1
CMD ["node","dist/index.js"]
