# Stage 1: Build Frontend (Node.js)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend (Go)
FROM golang:1.23-alpine AS go-builder
WORKDIR /app
# Copy dependency files first for caching
COPY go.mod ./
RUN go mod download
# Copy backend source
COPY . .
# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
# Build the single binary with embedded frontend
RUN CGO_ENABLED=0 GOOS=linux go build -o therefore-sharer .

# Stage 3: Final Image
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=go-builder /app/therefore-sharer .
EXPOSE 8080
# Data persists in /root/data if volume mapped
CMD ["./therefore-sharer"]
