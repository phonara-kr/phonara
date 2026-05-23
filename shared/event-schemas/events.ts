// Event Schema Definitions for PHONARA Distributed Exchange System
// All services must communicate ONLY via these event types

export enum EventType {
  // Order Events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_REJECTED = 'ORDER_REJECTED',
  ORDER_PARTIALLY_FILLED = 'ORDER_PARTIALLY_FILLED',
  ORDER_FULLY_FILLED = 'ORDER_FULLY_FILLED',

  // Trade Events
  TRADE_EXECUTED = 'TRADE_EXECUTED',
  TRADE_MATCHED = 'TRADE_MATCHED',
  TRADE_REJECTED = 'TRADE_REJECTED',

  // Liquidation Events
  LIQUIDATION_TRIGGERED = 'LIQUIDATION_TRIGGERED',
  LIQUIDATION_EXECUTED = 'LIQUIDATION_EXECUTED',
  MARGIN_CALL = 'MARGIN_CALL',

  // Wallet Events
  WALLET_CREDIT = 'WALLET_CREDIT',
  WALLET_DEBIT = 'WALLET_DEBIT',
  WALLET_LOCKED = 'WALLET_LOCKED',
  WALLET_UNLOCKED = 'WALLET_UNLOCKED',

  // Position Events
  POSITION_OPENED = 'POSITION_OPENED',
  POSITION_UPDATED = 'POSITION_UPDATED',
  POSITION_CLOSED = 'POSITION_CLOSED',
  POSITION_LIQUIDATED = 'POSITION_LIQUIDATED',

  // Price Events
  PRICE_UPDATE = 'PRICE_UPDATE',
  VOLATILITY_ALERT = 'VOLATILITY_ALERT',

  // System Events
  SYSTEM_HEALTH_CHECK = 'SYSTEM_HEALTH_CHECK',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_STOPPED = 'SERVICE_STOPPED',
}

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FULLY_FILLED = 'FULLY_FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum PositionSide {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  LIQUIDATED = 'LIQUIDATED',
}

// Base Event Structure
export interface BaseEvent {
  event_id: string;
  event_type: EventType;
  timestamp: string;
  version: string;
  source: string;
  correlation_id: string;
}

// Order Events
export interface OrderCreatedEvent extends BaseEvent {
  event_type: EventType.ORDER_CREATED;
  payload: {
    order_id: string;
    user_id: string;
    symbol: string;
    side: OrderSide;
    order_type: OrderType;
    price: number;
    quantity: number;
    filled_quantity: number;
    status: OrderStatus;
    idempotency_key: string;
    created_at: string;
  };
}

export interface OrderCancelledEvent extends BaseEvent {
  event_type: EventType.ORDER_CANCELLED;
  payload: {
    order_id: string;
    user_id: string;
    symbol: string;
    remaining_quantity: number;
    cancelled_at: string;
    reason: string;
  };
}

export interface OrderRejectedEvent extends BaseEvent {
  event_type: EventType.ORDER_REJECTED;
  payload: {
    order_id: string;
    user_id: string;
    reason: string;
    rejected_at: string;
  };
}

// Trade Events
export interface TradeExecutedEvent extends BaseEvent {
  event_type: EventType.TRADE_EXECUTED;
  payload: {
    trade_id: string;
    symbol: string;
    buy_order_id: string;
    sell_order_id: string;
    buyer_id: string;
    seller_id: string;
    price: number;
    quantity: number;
    buyer_fee: number;
    seller_fee: number;
    executed_at: string;
  };
}

// Position Events
export interface PositionOpenedEvent extends BaseEvent {
  event_type: EventType.POSITION_OPENED;
  payload: {
    position_id: string;
    user_id: string;
    symbol: string;
    side: PositionSide;
    entry_price: number;
    quantity: number;
    leverage: number;
    margin: number;
    liquidation_price: number;
    opened_at: string;
  };
}

export interface PositionUpdatedEvent extends BaseEvent {
  event_type: EventType.POSITION_UPDATED;
  payload: {
    position_id: string;
    user_id: string;
    current_price: number;
    unrealized_pnl: number;
    margin_ratio: number;
    updated_at: string;
  };
}

export interface PositionClosedEvent extends BaseEvent {
  event_type: EventType.POSITION_CLOSED;
  payload: {
    position_id: string;
    user_id: string;
    exit_price: number;
    realized_pnl: number;
    closed_at: string;
    reason: 'USER_INITIATED' | 'STOP_LOSS' | 'TAKE_PROFIT';
  };
}

export interface PositionLiquidatedEvent extends BaseEvent {
  event_type: EventType.POSITION_LIQUIDATED;
  payload: {
    position_id: string;
    user_id: string;
    liquidation_price: number;
    realized_pnl: number;
    penalty: number;
    liquidated_at: string;
  };
}

// Liquidation Events
export interface LiquidationTriggeredEvent extends BaseEvent {
  event_type: EventType.LIQUIDATION_TRIGGERED;
  payload: {
    position_id: string;
    user_id: string;
    symbol: string;
    current_margin_ratio: number;
    maintenance_margin: number;
    trigger_price: number;
    triggered_at: string;
  };
}

// Wallet Events
export interface WalletCreditEvent extends BaseEvent {
  event_type: EventType.WALLET_CREDIT;
  payload: {
    user_id: string;
    amount: number;
    balance_after: number;
    reference_type: 'DEPOSIT' | 'REWARD' | 'TRADING_PROFIT' | 'REFERRAL';
    reference_id: string;
    timestamp: string;
  };
}

export interface WalletDebitEvent extends BaseEvent {
  event_type: EventType.WALLET_DEBIT;
  payload: {
    user_id: string;
    amount: number;
    balance_after: number;
    reference_type: 'WITHDRAWAL' | 'TRADING_LOSS' | 'FEE';
    reference_id: string;
    timestamp: string;
  };
}

// Price Events
export interface PriceUpdateEvent extends BaseEvent {
  event_type: EventType.PRICE_UPDATE;
  payload: {
    symbol: string;
    price: number;
    change_24h: number;
    change_percent_24h: number;
    high_24h: number;
    low_24h: number;
    volume_24h: number;
    timestamp: string;
  };
}

// Union Type for All Events
export type ExchangeEvent =
  | OrderCreatedEvent
  | OrderCancelledEvent
  | OrderRejectedEvent
  | TradeExecutedEvent
  | PositionOpenedEvent
  | PositionUpdatedEvent
  | PositionClosedEvent
  | PositionLiquidatedEvent
  | LiquidationTriggeredEvent
  | WalletCreditEvent
  | WalletDebitEvent
  | PriceUpdateEvent;

// Event Topic Mapping
export const EVENT_TOPICS = {
  ORDER_EVENTS: 'order-events',
  TRADE_EVENTS: 'trade-events',
  LIQUIDATION_EVENTS: 'liquidation-events',
  WALLET_EVENTS: 'wallet-events',
  POSITION_EVENTS: 'position-events',
  PRICE_EVENTS: 'price-events',
  SYSTEM_EVENTS: 'system-events',
} as const;

// Event Topic Routing
export function getTopicForEvent(eventType: EventType): string {
  switch (eventType) {
    case EventType.ORDER_CREATED:
    case EventType.ORDER_CANCELLED:
    case EventType.ORDER_REJECTED:
      return EVENT_TOPICS.ORDER_EVENTS;

    case EventType.TRADE_EXECUTED:
    case EventType.TRADE_MATCHED:
      return EVENT_TOPICS.TRADE_EVENTS;

    case EventType.LIQUIDATION_TRIGGERED:
    case EventType.LIQUIDATION_EXECUTED:
    case EventType.MARGIN_CALL:
      return EVENT_TOPICS.LIQUIDATION_EVENTS;

    case EventType.WALLET_CREDIT:
    case EventType.WALLET_DEBIT:
    case EventType.WALLET_LOCKED:
    case EventType.WALLET_UNLOCKED:
      return EVENT_TOPICS.WALLET_EVENTS;

    case EventType.POSITION_OPENED:
    case EventType.POSITION_UPDATED:
    case EventType.POSITION_CLOSED:
    case EventType.POSITION_LIQUIDATED:
      return EVENT_TOPICS.POSITION_EVENTS;

    case EventType.PRICE_UPDATE:
    case EventType.VOLATILITY_ALERT:
      return EVENT_TOPICS.PRICE_EVENTS;

    default:
      return EVENT_TOPICS.SYSTEM_EVENTS;
  }
}

// Partition Key Strategy
export function getPartitionKey(event: ExchangeEvent): string {
  switch (event.event_type) {
    case EventType.ORDER_CREATED:
    case EventType.ORDER_CANCELLED:
    case EventType.ORDER_REJECTED:
      // Partition by user_id for consistent routing
      return (event as OrderCreatedEvent).payload.user_id;

    case EventType.TRADE_EXECUTED:
      // Partition by symbol for symbol-specific consumers
      return (event as TradeExecutedEvent).payload.symbol;

    case EventType.LIQUIDATION_TRIGGERED:
    case EventType.POSITION_LIQUIDATED:
      // Partition by user_id for account-sharded workers
      return 'user_id' in (event as any).payload ? (event as any).payload.user_id : 'default';

    case EventType.PRICE_UPDATE:
      // Partition by symbol
      return (event as PriceUpdateEvent).payload.symbol;

    default:
      return 'default';
  }
}


export { getTopicForEvent, getPartitionKey }