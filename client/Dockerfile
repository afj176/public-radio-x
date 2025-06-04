# Stage 1: Build the React Native Web application using Expo
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# If using yarn, copy yarn.lock and use yarn install

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the web application
# Ensure your project is configured for web export (e.g., expo install expo-router)
# The output directory is typically 'web-build'
RUN npm install -g expo-cli # Ensure expo-cli is available
RUN npx expo export:web

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine

# Remove default Nginx server configuration
# RUN rm /etc/nginx/conf.d/default.conf # Not strictly necessary if we overwrite with default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from the builder stage
COPY --from=builder /usr/src/app/web-build /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Default CMD for Nginx is to start the server.
# CMD ["nginx", "-g", "daemon off;"] is the default in the base image.
