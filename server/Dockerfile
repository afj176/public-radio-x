# Step 1: Base image for building the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build TypeScript code
# This assumes your tsconfig.json outputs to a 'dist' folder
RUN npm run build

# Step 2: Production image
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Copy package.json and package-lock.json for production dependencies installation
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
# Also copy over .env files if they are used for non-sensitive config,
# but prefer Docker Compose for actual secrets/environment-specific config.
# For this project, assuming .env might hold PORT or other non-secret defaults.
COPY --from=builder /usr/src/app/dist ./dist
# If you have a .env file with non-sensitive defaults, you might copy it:
# COPY .env .

# Expose the port the server listens on (e.g., 3000)
# Ensure this matches the port in your server's configuration (e.g., process.env.PORT || 3000)
EXPOSE 3000

# Command to run the application
# This assumes your package.json's "start" script runs "node dist/index.js"
# or similar, and that dist/index.js is the entry point.
CMD ["npm", "start"]
