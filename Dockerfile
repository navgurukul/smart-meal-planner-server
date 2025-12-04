# Stage 1: build
FROM node:20-bullseye-slim AS build

WORKDIR /app

# Install deps first (better cache)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev=false

COPY . .

# Build the Nest app
RUN npm run build

# Stage 2: runtime
FROM node:20-bullseye-slim AS runtime

WORKDIR /app

# Only prod deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built assets
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Nest build outputs under dist/src/main.js with current tsconfig.
CMD ["node", "dist/src/main.js"]
