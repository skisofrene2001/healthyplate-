FROM node:20-alpine
WORKDIR /app

# Backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy all source files
COPY . .

# Build frontend
RUN cd frontend && npm run build

EXPOSE 3001
WORKDIR /app/backend
CMD ["npm", "start"]
