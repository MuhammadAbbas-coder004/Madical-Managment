# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build tools in case native modules (like bcrypt) need compilation
RUN apk add --no-cache python3 make g++

COPY package*.json tsconfig.json ./

RUN npm install

COPY src ./src

RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/main.js"]
