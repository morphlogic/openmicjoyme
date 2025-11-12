# ---------- build ----------
FROM node:20-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
# Copy runtime files
COPY --from=build /app/server.cjs /app/server.cjs
COPY --from=build /app/dist /app/dist
COPY package*.json ./
RUN npm ci --omit=dev

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:4000/health', r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node","server.cjs"]
