FROM node:20-alpine AS base
WORKDIR /app
COPY services/api/package.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY services/api/ ./
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY services/api/package.json ./
COPY --from=base /app/package-lock.json ./package-lock.json
COPY --from=base /app/node_modules ./node_modules
RUN npm prune --omit=dev
EXPOSE 4001
CMD ["node", "dist/index.js"]
