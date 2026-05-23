// Order Ingestion Service - Layer 2
// Validates incoming orders and publishes to event bus
import { randomUUID } from 'crypto';
import { BaseEvent, EventType, OrderCreatedEvent, OrderCancelledEvent, OrderRejectedEvent } from '../shared/event-schemas/events';
import { getEventBus } from '../shared/event-schemas/event-bus';

export interface OrderRequest {
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  price: number;
  quantity: number;
  idempotency_key?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class OrderValidator {
  static validate(order: OrderRequest): ValidationResult {
    const errors: string[] = [];

    if (!order.user_id) {
      errors.push('user_id is required');
    }

    if (!order.symbol) {
      errors.push('symbol is required');
    }

    if (!['BUY', 'SELL'].includes(order.side)) {
      errors.push('side must be BUY or SELL');
    }

    if (!['MARKET', 'LIMIT'].includes(order.order_type)) {
      errors.push('order_type must be MARKET or LIMIT');
    }

    if (order.order_type === 'LIMIT') {
      if (!order.price || order.price <= 0) {
        errors.push('price must be greater than 0 for LIMIT orders');
      }
    }

    if (!order.quantity || order.quantity <= 0) {
      errors.push('quantity must be greater than 0');
    }

    if (order.quantity > 1000000) {
      errors.push('quantity exceeds maximum limit');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateSymbol(symbol: string): boolean {
    const validSymbols = ['PHON/USD', 'BTC/USD', 'ETH/USD'];
    return validSymbols.includes(symbol);
  }
}

export class OrderIngestionService {
  private eventBus = getEventBus();
  private orderIdCounter = 0;

  constructor() {
    this.eventBus.connect();
  }

  async processOrder(request: OrderRequest): Promise<{ orderId: string; success: boolean }> {
    const orderId = `ord-${Date.now()}-${this.orderIdCounter++}`;
    const idempotencyKey = request.idempotency_key || randomUUID();
    const correlationId = randomUUID();
    const timestamp = new Date().toISOString();

    const validation = OrderValidator.validate(request);
    if (!validation.valid) {
      console.log(`[OrderIngestion] Order rejected: ${validation.errors.join(', ')}`);
      return { orderId: orderId, success: false };
    }

    if (!OrderValidator.validateSymbol(request.symbol)) {
      console.log(`[OrderIngestion] Invalid symbol: ${request.symbol}`);
      return { orderId: orderId, success: false };
    }

    console.log(`[OrderIngestion] Processing order ${orderId}`, {
      user_id: request.user_id,
      symbol: request.symbol,
      side: request.side,
      type: request.order_type,
    });

    const orderCreatedEvent: OrderCreatedEvent = {
      event_id: randomUUID(),
      event_type: EventType.ORDER_CREATED,
      timestamp,
      version: '1.0',
      source: 'order-ingestion-service',
      correlation_id: correlationId,
      payload: {
        order_id: orderId,
        user_id: request.user_id,
        symbol: request.symbol,
        side: request.side,
        order_type: request.order_type,
        price: request.order_type === 'LIMIT' ? request.price : 0,
        quantity: request.quantity,
        filled_quantity: 0,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        created_at: timestamp,
      },
    };

    try {
      await this.eventBus.publish(orderCreatedEvent);
      console.log(`[OrderIngestion] Order ${orderId} published to event bus`);
      return { orderId: orderId, success: true };
    } catch (error) {
      console.error(`[OrderIngestion] Error publishing order ${orderId}:`, error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean }> {
    const correlationId = randomUUID();
    const timestamp = new Date().toISOString();

    console.log(`[OrderIngestion] Cancelling order ${orderId} for user ${userId}`);

    const orderCancelledEvent: OrderCancelledEvent = {
      event_id: randomUUID(),
      event_type: EventType.ORDER_CANCELLED,
      timestamp,
      version: '1.0',
      source: 'order-ingestion-service',
      correlation_id: correlationId,
      payload: {
        order_id: orderId,
        user_id: userId,
        symbol: '',
        remaining_quantity: 0,
        cancelled_at: timestamp,
        reason: 'USER_REQUEST',
      },
    };

    try {
      await this.eventBus.publish(orderCancelledEvent);
      console.log(`[OrderIngestion] Order ${orderId} cancellation published to event bus`);
      return { success: true };
    } catch (error) {
      console.error(`[OrderIngestion] Error cancelling order ${orderId}:`, error);
      throw error;
    }
  }

  handleHTTPEndpoint(req: any, res: any): void {
    console.log('[OrderIngestion] HTTP request received');
  }
}

let serviceInstance: OrderIngestionService | null = null;

export function getOrderIngestionService(): OrderIngestionService {
  if (!serviceInstance) {
    serviceInstance = new OrderIngestionService();
  }
  return serviceInstance;
}
