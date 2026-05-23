# PHONARA V2 - Docker Compose Configuration for Local Development
# Production deployment uses Kubernetes manifests

version: '3.8'

services:
  # Infrastructure Services
  redis:
    image: redis:7-alpine
    container_name: phonara-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Event Bus (Kafka-compatible simulation)
  event-bus:
    image: node:18-alpine
    container_name: phonara-event-bus
    ports:
      - "9092:9092"
    volumes:
      - ./services:/app/services
      - ./shared:/app/shared
    working_dir: /app
    command: node -e "console.log('Event bus running on port 9092')"

  # API Gateway Service (Layer 1)
  api-gateway:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.api-gateway
    container_name: phonara-api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis
      - event-bus
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Order Ingestion Service (Layer 2)
  order-ingestion:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: order-ingestion
    container_name: phonara-order-ingestion
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3001
    depends_on:
      - event-bus
    volumes:
      - ./services/order-ingestion:/app
      - ./shared:/app/shared

  # Matching Engine Service (Layer 4)
  matching-engine:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: matching-engine
    container_name: phonara-matching-engine
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3002
      - SYMBOL_SHARD=PHON/USD
    depends_on:
      - event-bus
      - redis
    volumes:
      - ./services/matching-engine:/app
      - ./shared:/app/shared
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4096M
        reservations:
          cpus: '1'
          memory: 2048M

  # Liquidation Engine Service (Layer 5)
  liquidation-engine:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: liquidation-engine
    container_name: phonara-liquidation-engine
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3003
    depends_on:
      - event-bus
    volumes:
      - ./services/liquidation-engine:/app
      - ./shared:/app/shared

  # Ledger Service (Layer 6)
  ledger-service:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: ledger-service
    container_name: phonara-ledger-service
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3004
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    depends_on:
      - event-bus
    volumes:
      - ./services/ledger-service:/app
      - ./shared:/app/shared

  # WebSocket Gateway Service (Layer 7)
  websocket-gateway:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: websocket-gateway
    container_name: phonara-websocket-gateway
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3005
    depends_on:
      - event-bus
    volumes:
      - ./services/websocket-gateway:/app
      - ./shared:/app/shared

  # Price Feed Service
  price-feed:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
      args:
        SERVICE_NAME: price-feed
    container_name: phonara-price-feed
    ports:
      - "3006:3006"
    environment:
      - KAFKA_BROKERS=event-bus:9092
      - SERVICE_PORT=3006
    depends_on:
      - event-bus

volumes:
  redis-data:
    driver: local

networks:
  default:
    name: phonara-network
