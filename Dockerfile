# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_BASE=/
# Optional: backend API URL (set via --build-arg VITE_API_URL=https://... in CI/CD)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Runtime stage – serves the React frontend via Nginx and the Express API side-by-side
FROM node:20-alpine

# Install Nginx
RUN apk add --no-cache nginx && mkdir -p /run/nginx

# ── Install Express backend ───────────────────────────────────────────────────
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ .

# ── Copy built frontend to Nginx web root ─────────────────────────────────────
COPY --from=build /app/dist /usr/share/nginx/html

# ── Nginx configuration ───────────────────────────────────────────────────────
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ── Entrypoint: start Express then Nginx ──────────────────────────────────────
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
