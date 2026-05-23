// Websocket Gateway Service - Layer 7
// Real-time price and trade updates via WebSocket

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { ExchangeEvent, PriceUpdateEvent, EventType } from '../shared/event-schemas/events';

export interface WebSocketClient {
  id: string;
  userId?: string;
  subscriptions: Set<string>;
  lastActivity: number;
  send: (data: string) => void;
}

export interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  channels: string[];
  auth?: string;
}

export interface PriceUpdateData {
  symbol: string;
  price: number;
  change_24h: number;
  change_percent_24h: number;
  timestamp: string;
}

export class WebSocketGateway extends EventEmitter {
  private clients: Map<string, WebSocketClient> = new Map();
  private userClients: Map<string, Set<string>> = new Map();
  private symbolSubscribers: Map<string, Set<string>> = new Map();
  private isRunning: boolean = false;

  constructor() {
    super();
  }

  connectClient(clientId: string, send: (data: string) => void): WebSocketClient {
    const client: WebSocketClient = {
      id: clientId,
      subscriptions: new Set(),
      lastActivity: Date.now(),
      send,
    };

    this.clients.set(clientId, client);
    console.log(`[WSGateway] Client ${clientId} connected. Total clients: ${this.clients.size}`);

    this.emit('client_connected', clientId);
    return client;
  }

  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.forEach((channel) => {
      const subscribers = this.symbolSubscribers.get(channel);
      if (subscribers) {
        subscribers.delete(clientId);
      }
    });

    if (client.userId) {
      const userClients = this.userClients.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    this.clients.delete(clientId);
    console.log(`[WSGateway] Client ${clientId} disconnected. Total clients: ${this.clients.size}`);

    this.emit('client_disconnected', clientId);
  }

  handleMessage(clientId: string, message: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = Date.now();

    try {
      const data: SubscriptionMessage = JSON.parse(message);

      switch (data.type) {
        case 'subscribe':
          this.subscribe(clientId, data.channels, data.auth);
          break;
        case 'unsubscribe':
          this.unsubscribe(clientId, data.channels);
          break;
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Unknown message type',
          });
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format',
      });
    }
  }

  private subscribe(clientId: string, channels: string[], auth?: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    channels.forEach((channel) => {
      client.subscriptions.add(channel);

      if (!this.symbolSubscribers.has(channel)) {
        this.symbolSubscribers.set(channel, new Set());
      }
      this.symbolSubscribers.get(channel)!.add(clientId);
    });

    this.sendToClient(clientId, {
      type: 'subscribed',
      channels,
      timestamp: Date.now(),
    });

    console.log(`[WSGateway] Client ${clientId} subscribed to: ${channels.join(', ')}`);
  }

  private unsubscribe(clientId: string, channels: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    channels.forEach((channel) => {
      client.subscriptions.delete(channel);

      const subscribers = this.symbolSubscribers.get(channel);
      if (subscribers) {
        subscribers.delete(clientId);
      }
    });

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channels,
      timestamp: Date.now(),
    });
  }

  authenticateClient(clientId: string, userId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.userId = userId;

    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(clientId);

    this.sendToClient(clientId, {
      type: 'authenticated',
      userId,
      timestamp: Date.now(),
    });

    console.log(`[WSGateway] Client ${clientId} authenticated as ${userId}`);
  }

  private sendToClient(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.send(JSON.stringify(data));
      } catch (error) {
        console.error(`[WSGateway] Error sending to client ${clientId}:`, error);
      }
    }
  }

  broadcastToChannel(channel: string, data: any): void {
    const subscribers = this.symbolSubscribers.get(channel);
    if (!subscribers) return;

    const message = JSON.stringify({
      ...data,
      channel,
      timestamp: Date.now(),
    });

    subscribers.forEach((clientId) => {
      this.sendToClient(clientId, data);
    });
  }

  broadcastPriceUpdate(update: PriceUpdateData): void {
    const channel = `price:${update.symbol}`;
    this.broadcastToChannel(channel, {
      type: 'price_update',
      data: update,
    });
  }

  sendToUser(userId: string, data: any): void {
    const userClients = this.userClients.get(userId);
    if (!userClients) return;

    userClients.forEach((clientId) => {
      this.sendToClient(clientId, data);
    });
  }

  broadcastEvent(event: ExchangeEvent): void {
    switch (event.event_type) {
      case EventType.PRICE_UPDATE: {
        const priceEvent = event as PriceUpdateEvent;
        this.broadcastPriceUpdate({
          symbol: priceEvent.payload.symbol,
          price: priceEvent.payload.price,
          change_24h: priceEvent.payload.change_24h,
          change_percent_24h: priceEvent.payload.change_percent_24h,
          timestamp: priceEvent.payload.timestamp,
        });
        break;
      }

      default:
        console.log(`[WSGateway] Unhandled event type: ${event.event_type}`);
    }
  }

  getStats(): any {
    return {
      totalClients: this.clients.size,
      authenticatedClients: this.userClients.size,
      channels: this.symbolSubscribers.size,
      subscriptions: Array.from(this.symbolSubscribers.entries()).map(([channel, clients]) => ({
        channel,
        subscribers: clients.size,
      })),
    };
  }

  start(): void {
    this.isRunning = true;
    console.log('[WSGateway] WebSocket Gateway started');

    setInterval(() => {
      this.cleanupInactiveClients();
    }, 60000);
  }

  stop(): void {
    this.isRunning = false;
    console.log('[WSGateway] WebSocket Gateway stopped');
  }

  private cleanupInactiveClients(): void {
    const now = Date.now();
    const timeout = 300000;

    this.clients.forEach((client, clientId) => {
      if (now - client.lastActivity > timeout) {
        console.log(`[WSGateway] Cleaning up inactive client ${clientId}`);
        this.disconnectClient(clientId);
      }
    });
  }
}

let gatewayInstance: WebSocketGateway | null = null;

export function getWebSocketGateway(): WebSocketGateway {
  if (!gatewayInstance) {
    gatewayInstance = new WebSocketGateway();
  }
  return gatewayInstance;
}
