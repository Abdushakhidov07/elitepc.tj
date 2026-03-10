# ──────────────────────────────────────────────
# Stage 1: Build the React application
# ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (leverages Docker layer caching)
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \
    else npm install; fi

# Copy source code and build
COPY . .
RUN if [ -f package-lock.json ]; then npm run build; \
    elif [ -f yarn.lock ]; then yarn build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm run build; \
    else npm run build; fi

# ──────────────────────────────────────────────
# Stage 2: Serve with Nginx
# ──────────────────────────────────────────────
FROM nginx:1.25-alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from the build stage
# Vite outputs to "dist", Create React App outputs to "build"
COPY --from=build /app/dist /usr/share/nginx/html
# Fallback: if dist does not exist, try build (CRA)
# This is handled by the nginx try_files directive

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
