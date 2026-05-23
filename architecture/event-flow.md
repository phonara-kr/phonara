# PHONARA V2 - System Architecture Documentation

## Event Flow (End-to-End)

```
[USER SUBMITS ORDER]
          |
          v
[Layer 1: API GATEWAY POD]
  - JWT validation
  - Rate limiting
  - Request routing
  - NO business logic
          |
          v
[Layer 2: ORDER INGESTION POD]
  - Schema validation
  - Order ID generation
  - Publishes ORDER_CREATED event
  - NO database writes
          |
          v
[EVENT BUS: order-events TOPIC]
  - Partitioned by user_id
  - Ensures ordered delivery to consumers
          |
          v
[Layer 4: MATCHING ENGINE POD]
  - Consumes ORDER_CREATED
  - Maintains heap-based order book (in-memory)
  - Price-time priority matching
  - NO database access
  - NO HTTP calls
  - Publishes TRADE_EXECUTED event
          |
          v
[EVENT BUS: trade-events TOPIC]
  - Partitioned by symbol
  - Deterministic sequencing
          |
          +------------------+
          |                  |
          v                  v
[Layer 5: LIQUIDATION]  [Layer 6: LEDGER SERVICE]
ENGINE POD             POD (Source of Truth)
  - Consumes trade-event  - Consumes TRADE_EXECUTED
  - Consumes price-update  - Consumes WALLET_CREDIT
  - Calculates margin     - Consumes POSITION_CHANGE
  - Detects liquidation   - Writes to Aurora PostgreSQL
  - NO database access    - ONLY write operations
  - Publishes LIQUIDATION_TRIGGERED
          |                  |
          v                  |
[EVENT BUS: liquidation-events]
          |
          v
[MATCHING ENGINE]
  - Creates forced market order
          |
          v
[TRADE_EXECUTED]
          |
          v
[LEDGER SERVICE]
  - Writes liquidation record
  - Updates wallet (deduct penalty)
          |
          v
[EVENT BUS: wallet-events]
          |
          v
[Layer 7: WEBSOCKET GATEWAY POD]
  - Consumes all trade/price/wallet events
  - Pushes updates to frontend
  - NO computation
  - NO database queries
          |
          v
[FRONTEND]
  - Real-time updates via WebSocket
  - Optimistic UI updates
  - NO direct DB access
```

## Trading Flow - Complete Lifecycle

### 1. Order Submission
```
User Action: Submit BUY LIMIT order
  -> POST /api/orders (API Gateway)
  -> Validate Auth (JWT)
  -> Route to Order Service
  -> Validate Schema
  -> Generate Order ID
  -> Publish ORDER_CREATED event
```

### 2. Order Matching
```
ORDER_CREATED event
  -> Matching Engine (heap-based order book)
  -> Check if marketable
  -> Match against orders
  -> Generate TRADE_EXECUTED events (one or more)
  -> Update remaining quantity
  -> Add to order book (if limit order with remaining Qty)
```

### 3. Trade Settlement
```
TRADE_EXECUTED event
  -> Ledger Service (parallel processing)
    -> Write to trades table
    -> Update wallet balances (buyer + seller)
    -> Create transaction records
    -> Update position records

  -> Liquidation Engine (parallel processing)
    -> Find positions affected by trade
    -> Update position current_price
    -> Calculate margin ratio
    -> Trigger liquidation if needed
```

### 4. Liquidation
```
LIQUIDATION_TRIGGERED event
  -> Matching Engine receives
  -> Creates forced MARKET SELL order
  -> Publishes TRADE_EXECUTED
  -> Ledger Service
    -> Write liquidation record
    -> Deduct liquidation penalty
    -> Update position to LIQUIDATED
```

### 5. Real-Time Updates
```
All EVENTS (TRADE_EXECUTED, PRICE_UPDATE, WALLET_*, POSITION_*)
  -> WebSocket Gateway
  -> Filter by user subscription
  -> Push via WebSocket to frontend
```

## Scaling Architecture

### Horizontal Pod Autoscaling

**Matching Engine**
- Metric: orders/second per symbol
- Target: 8,000 orders/sec
- Min replicas: 3
- Max replicas: 20
- Partition by symbol

**Liquidation Engine**
- Metric: positions per engine
- Target: 10,000 positions
- Min replicas: 2
- Max replicas: 10
- Partition by user_id hash

**Ledger Service**
- Single writer (no scaling)
- Guarantees exactly-once writes
- Idempotent operations

### Partition Strategy

**Order Events (order-events topic)**
- 12 partitions
- Key: user_id (consistent hashing)
- Guarantees: same user -> same partition -> order preserved

**Trade Events (trade-events topic)**
- 20 partitions
- Key: symbol (symbol partitioning)
- Guarantees: deterministic execution per symbol

**Wallet Events (wallet-events topic)**
- 10 partitions
- Key: user_id
- Compacted topic for latest state

## Data Consistency

### Ledger Service Guarantees
- Exactly-once event processing
- Idempotent writes (eventIdempotency check)
- Immutable append-only tables
- No updates or deletes
- Full audit trail

### Matching Engine Guarantees
- Deterministic execution (price-time priority)
- FIFO within price level
- Partial fills supported
- No message loss (acks=all)

### Liquidation Engine Guarantees
- Real-time margin calculation
- Priority queue for liquidations
- Penalty application
- Event-based triggers only

## Failure Modes

### Scenario 1: Matching Engine Pod Crash
- Order book state lost
- Redis snapshot used for recovery
- Replay from Kafka (committed offset)
- No data loss (events are persistent)

### Scenario 2: Ledger Service Crash
- Write queue persists in Kafka
- Reconnect and resume from committed offset
- Idempotent writes prevent duplicates
- Aurora PostgreSQL backups for disaster recovery

### Scenario 3: Loss of Redis Cache
- Order book snapshots lost
- Rebuild from Kafka event log
- Event sourcing pattern (replay all ORDER_CREATED)
- No user data affected (always in Kafka)

### Scenario 4: Kafka Broker Failure
- Multi-AZ replication (3 replicas)
- Automatic leader election
- Consumers reconnect to new leader
- No message loss (min.insync.replicas=2)

## Production Deployment Checklist

1. **Infrastructure**
   - [ ] EKS cluster deployed
   - [ ] MSK Kafka cluster (3 brokers)
   - [ ] Aurora PostgreSQL (multi-AZ)
   - [ ] ElastiCache Redis (cluster mode)
   - [ ] ALB configured

2. **Services**
   - [ ] API Gateway deployed (3 replicas)
   - [ ] Order Ingestion deployed (2 replicas)
   - [ ] Matching Engine deployed (HPA enabled)
   - [ ] Liquidation Engine deployed (2 replicas)
   - [ ] Ledger Service deployed (1 replica)
   - [ ] WebSocket Gateway deployed (3 replicas)

3. **Monitoring**
   - [ ] Prometheus metrics collected
   - [ ] Grafana dashboards configured
   - [ ] AlertManager rules set up
   - [ ] Log aggregation (Elasticsearch)
   - [ ] Distributed tracing (Jaeger)

4. **Security**
   - [ ] mTLS enabled between services
   - [ ] JWT validation at API Gateway
   - [ ] RLS policies on PostgreSQL
   - [ ] Secrets in Kubernetes Secrets
   - [ ] Network policies configured

5. **Testing**
   - [ ] Load testing (10,000+ orders/sec)
   - [ ] Chaos testing (pod crashes)
   - [ ] Failover testing (Kafka broker fail)
   - [ ] Integration tests (end-to-end flow)
   - [ ] Penetration testing

## Performance Targets

| Metric | Target |
|--------|--------|
| Order matching latency | < 1ms |
| WebSocket message latency | < 10ms |
| Orders per second | > 10,000 |
| Concurrent WebSocket connections | > 10,000 |
| Event processing throughput | > 50,000 events/sec |
| Ledger write latency | < 50ms |
| System uptime | 99.95% |

## Cost Estimates (AWS us-east-1)

| Service | Monthly Cost |
|---------|-------------|
| EKS (3 m5.xlarge) | $350 |
| MSK Kafka (3 brokers) | $600 |
| Aurora PostgreSQL | $300 |
| ElastiCache Redis | $150 |
| ALB + Data Transfer | $100 |
| CloudWatch + Monitoring | $50 |
| **Total** | **~$1,550/month** |

---

**System now operates as a fully distributed, event-driven, Kubernetes-based financial simulation exchange**
