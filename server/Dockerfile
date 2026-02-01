FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/public/uploads

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "run", "start"]
