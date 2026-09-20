# ── Stage 1: Build ────────────────────────────────────────────────
# Uses the full Node image to install dependencies and compile the app.
# All VITE_ variables must be provided here because Vite bakes them into
# the bundle at compile time; they are not available at runtime.
FROM node:20-alpine AS builder

WORKDIR /app

# Declare every VITE_ variable as a build arg so Railway (or any CI)
# can inject them via --build-arg or the dashboard's environment variables.
ARG VITE_API_BASE_URL
ARG VITE_API_HOST
ARG VITE_API_PORT
ARG VITE_USE_MOCK_API
ARG VITE_ENVIRONMENT

# Promote args to env vars so Vite can read them during the build step.
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_HOST=$VITE_API_HOST \
    VITE_API_PORT=$VITE_API_PORT \
    VITE_USE_MOCK_API=$VITE_USE_MOCK_API \
    VITE_ENVIRONMENT=$VITE_ENVIRONMENT

# Install dependencies first (separate layer — cached unless package.json changes).
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build.
COPY . .
RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────
# Minimal Nginx image — no Node, no source code, no node_modules.
# Final image is typically ~25 MB.
FROM nginx:1.27-alpine

# Remove the default placeholder config.
RUN rm /etc/nginx/conf.d/default.conf

# The official nginx image processes any *.conf.template file placed in
# /etc/nginx/templates/ at container start, running envsubst on it.
# This lets ${PORT} be resolved from Railway's runtime PORT variable.
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy the compiled static assets from the builder stage.
COPY --from=builder /app/dist /usr/share/nginx/html

# Document the port (overridden at runtime by $PORT from Railway).
EXPOSE 8080
