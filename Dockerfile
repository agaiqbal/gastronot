FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app files
COPY server.js ./
COPY public/ ./public/

# Create data directory (will be mounted as volume in production)
RUN mkdir -p data

EXPOSE 3000

CMD ["node", "server.js"]
