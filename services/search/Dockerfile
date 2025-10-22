FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build && npm prune --omit=dev
USER node
ENV SEARCH_PORT=4002
EXPOSE 4002
HEALTHCHECK CMD wget -qO- http://localhost:8088/healthz || exit 1
CMD ["node","dist/index.js"]
