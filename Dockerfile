# ---- BUILD ANGULAR ----
FROM node:20-alpine AS builder
WORKDIR /src

# Install deps first for better caching
COPY package*.json ./
RUN npm ci

# Copy source and build (assumes "build" script runs ng build)
COPY . .
RUN npm run build

# ---- RUNTIME (Express + Nodemailer) ----
FROM node:20-alpine AS runtime
WORKDIR /app
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "require('http').get('http://127.0.0.1:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# App server
COPY server.cjs .

# Install runtime-only deps (pin CJS-friendly limiter)
RUN npm init -y \
 && npm install express compression nodemailer express-rate-limit@6

# Static build from builder
COPY --from=builder /src/dist ./dist

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node","server.cjs"]
