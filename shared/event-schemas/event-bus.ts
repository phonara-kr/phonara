// Event Bus - Production-Grade Event Streaming System
// Implements Kafka-compatible interfaces for distributed systems

import { EventEmitter } from 'events';
import { ExchangeEvent, getTopicForEvent, getPartitionKey } from './events';

export interface EventConsumer {
  subscribe(topics: string[], handler: (event: ExchangeEvent) => Promise<void>): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface EventProducer {
  publish(event: ExchangeEvent): Promise<void>;
  flush(): Promise<void>;
}

// In-Memory Event Bus (Kafka-compatible interface)
// Replace with actual Kafka client (kafkajs or confluent-kafka-javascript) in production
export class InMemoryEventBus {
  private topics: Map<string, EventEmitter> = new Map();
  private consumerGroups: Map<string, Set<string>> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.initializeTopics();
  }

  private initializeTopics(): void {
    const topicNames = [
      'order-events',
      'trade-events',
      'liquidation-events',
      'wallet-events',
      'position-events',
      'price-events',
      'system-events',
    ];

    topicNames.forEach((topic) => {
      this.topics.set(topic, new EventEmitter());
      this.topics.get(topic)!.setMaxListeners(1000);
    });
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    console.log('[EventBus] Connected to event bus');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('[EventBus] Disconnected from event bus');
  }

  async publish(event: ExchangeEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    const topic = getTopicForEvent(event.event_type);
    const partitionKey = getPartitionKey(event);
    const emitter = this.topics.get(topic);

    if (!emitter) {
      console.error(`[EventBus] Topic ${topic} not found`);
      return;
    }

    console.log(`[EventBus] Publishing to ${topic}`, {
      event_type: event.event_type,
      partition_key: partitionKey,
      event_id: event.event_id,
    });

    emitter.emit('event', { event, partition: partitionKey });

    await new Promise((resolve) => setImmediate(resolve));
  }

  async subscribe(
    topics: string[],
    consumerGroup: string,
    handler: (event: ExchangeEvent) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('EventBus not connected');
    }

    if (!this.consumerGroups.has(consumerGroup)) {
      this.consumerGroups.set(consumerGroup, new Set());
    }

    topics.forEach((topic) => {
      const emitter = this.topics.get(topic);
      if (!emitter) {
        console.error(`[EventBus] Topic ${topic} not found`);
        return;
      }

      const subscriptionId = `${consumerGroup}-${topic}-${Date.now()}`;
      this.consumerGroups.get(consumerGroup)!.add(subscriptionId);

      const listener = async (data: { event: ExchangeEvent; partition: string }) => {
        try {
          await handler(data.event);
        } catch (error) {
          console.error(`[EventBus] Error in consumer ${consumerGroup}:`, error);
        }
      };

      emitter.on('event', listener);
      console.log(`[EventBus] Consumer ${consumerGroup} subscribed to ${topic}`);
    });
  }

  getStats(): Map<string, EventEmitter> {
    return this.topics;
  }
}

// Kafka-Compatible Producer (for production deployment)
export class KafkajsProducer implements EventProducer {
  private client: any;
  private producer: any;
  private isConnected: boolean = false;

  constructor(config: { brokers: string[]; clientId: string }) {
    // In production, use: import { Kafka } from 'kafkajs'
    // this.client = new Kafka({
    //   brokers: config.brokers,
    //   clientId: config.clientId,
    // });
    // this.producer = this.client.producer();
    console.log('[KafkaProducer] Initialized (simulation mode)');
  }

  async connect(): Promise<void> {
    // await this.producer.connect();
    this.isConnected = true;
    console.log('[KafkaProducer] Connected');
  }

  async publish(event: ExchangeEvent): Promise<void> {
    const topic = getTopicForEvent(event.event_type);
    const partitionKey = getPartitionKey(event);

    console.log(`[KafkaProducer] Publishing to ${topic}`, {
      event_type: event.event_type,
      partition_key: partitionKey,
    });

    // In production:
    // await this.producer.send({
    //   topic,
    //   messages: [
    //     {
    //       key: partitionKey,
    //       value: JSON.stringify(event),
    //       headers: {
    //         'event-type': event.event_type,
    //         'correlation-id': event.correlation_id,
    //       },
    //     },
    //   ],
    // });
  }

  async flush(): Promise<void> {
    // Kafka producer flush logic
    console.log('[KafkaProducer] Flushed');
  }

  async disconnect(): Promise<void> {
    // await this.producer.disconnect();
    this.isConnected = false;
  }
}

// Kafka-Compatible Consumer (for production deployment)
export class KafkajsConsumer implements EventConsumer {
  private client: any;
  private consumer: any;
  private groupId: string;
  private isConnected: boolean = false;
  private subscriptions: Map<string, (event: ExchangeEvent) => Promise<void>> = new Map();

  constructor(config: { brokers: string[]; clientId: string; groupId: string }) {
    this.groupId = config.groupId;
    // In production:
    // this.client = new Kafka({
    //   brokers: config.brokers,
    //   clientId: config.clientId,
    // });
    // this.consumer = this.client.consumer({ groupId: config.groupId });
    console.log(`[KafkaConsumer] Initialized for group ${config.groupId}`);
  }

  async connect(): Promise<void> {
    // await this.consumer.connect();
    this.isConnected = true;
    console.log(`[KafkaConsumer] Connected (group: ${this.groupId})`);
  }

  async subscribe(
    topics: string[],
    handler: (event: ExchangeEvent) => Promise<void>
  ): Promise<void> {
    topics.forEach((topic) => {
      this.subscriptions.set(topic, handler);
      console.log(`[KafkaConsumer] Subscribed to ${topic}`);
    });
    // await this.consumer.subscribe({ topics, fromBeginning: false });
  }

  async start(): Promise<void> {
    // In production:
    // await this.consumer.run({
    //   eachMessage: async ({ topic, partition, message }) => {
    //     const event = JSON.parse(message.value!.toString()) as ExchangeEvent;
    //     const handler = this.subscriptions.get(topic);
    //     if (handler) {
    //       await handler(event);
    //     }
    //   },
    // });
    console.log(`[KafkaConsumer] Started (group: ${this.groupId})`);
  }

  async stop(): Promise<void> {
    // await this.consumer.disconnect();
    this.isConnected = false;
    console.log(`[KafkaConsumer] Stopped`);
  }
}

// Singleton Event Bus Instance
let eventBusInstance: InMemoryEventBus | null = null;

export function getEventBus(): InMemoryEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new InMemoryEventBus();
  }
  return eventBusInstance;
}

export function initializeEventBus(): InMemoryEventBus {
  const bus = getEventBus();
  bus.connect();
  return bus;
}
