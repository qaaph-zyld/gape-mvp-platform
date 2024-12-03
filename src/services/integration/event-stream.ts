import { EventEmitter } from 'events';
import { Kafka, Producer, Consumer, Message } from 'kafkajs';
import { RedisClient } from 'redis';
import { StreamEvent, StreamConfig, EventHandler, EventFilter } from '../types/stream';

export class EventStream {
  private eventEmitter: EventEmitter;
  private kafka: Kafka | null;
  private producer: Producer | null;
  private consumers: Map<string, Consumer>;
  private redis: RedisClient | null;
  private handlers: Map<string, EventHandler[]>;
  private filters: Map<string, EventFilter[]>;

  constructor(config: StreamConfig) {
    this.eventEmitter = new EventEmitter();
    this.consumers = new Map();
    this.handlers = new Map();
    this.filters = new Map();

    // Initialize Kafka if configured
    if (config.kafka) {
      this.kafka = new Kafka({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        ssl: config.kafka.ssl,
        sasl: config.kafka.sasl
      });
      this.producer = this.kafka.producer();
    } else {
      this.kafka = null;
      this.producer = null;
    }

    // Initialize Redis if configured
    if (config.redis) {
      this.redis = new RedisClient(config.redis);
    } else {
      this.redis = null;
    }
  }

  async initialize(): Promise<void> {
    if (this.producer) {
      await this.producer.connect();
    }
    if (this.redis) {
      await new Promise((resolve, reject) => {
        this.redis!.on('ready', resolve);
        this.redis!.on('error', reject);
      });
    }
  }

  async shutdown(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
    }
    for (const consumer of this.consumers.values()) {
      await consumer.disconnect();
    }
    if (this.redis) {
      await new Promise(resolve => this.redis!.quit(resolve));
    }
  }

  async publish(event: StreamEvent): Promise<void> {
    // Apply filters
    if (!this.shouldPublishEvent(event)) {
      return;
    }

    // Emit locally
    this.eventEmitter.emit(event.type, event);

    // Publish to Kafka if available
    if (this.producer) {
      await this.producer.send({
        topic: event.type,
        messages: [{
          key: event.id,
          value: JSON.stringify(event)
        }]
      });
    }

    // Publish to Redis if available
    if (this.redis) {
      await new Promise((resolve, reject) => {
        this.redis!.publish(
          event.type,
          JSON.stringify(event),
          (err) => err ? reject(err) : resolve(null)
        );
      });
    }

    // Execute handlers
    await this.executeHandlers(event);
  }

  async subscribe(
    eventType: string,
    handler: EventHandler,
    options: {
      fromBeginning?: boolean;
      groupId?: string;
    } = {}
  ): Promise<void> {
    // Register local handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);

    // Subscribe to local events
    this.eventEmitter.on(eventType, handler);

    // Subscribe to Kafka if available
    if (this.kafka) {
      const consumer = this.kafka.consumer({
        groupId: options.groupId || `group-${eventType}`
      });
      await consumer.connect();
      await consumer.subscribe({
        topic: eventType,
        fromBeginning: options.fromBeginning
      });
      await consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value!.toString());
          await handler(event);
        }
      });
      this.consumers.set(eventType, consumer);
    }

    // Subscribe to Redis if available
    if (this.redis) {
      const subscriber = this.redis.duplicate();
      await new Promise((resolve, reject) => {
        subscriber.on('ready', resolve);
        subscriber.on('error', reject);
      });
      await new Promise(resolve => {
        subscriber.subscribe(eventType, resolve);
      });
      subscriber.on('message', (channel, message) => {
        if (channel === eventType) {
          const event = JSON.parse(message);
          handler(event);
        }
      });
    }
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    // Remove local handler
    const handlers = this.handlers.get(eventType) || [];
    this.handlers.set(
      eventType,
      handlers.filter(h => h !== handler)
    );

    // Remove from event emitter
    this.eventEmitter.off(eventType, handler);

    // Disconnect Kafka consumer if no handlers left
    if (handlers.length === 0 && this.consumers.has(eventType)) {
      const consumer = this.consumers.get(eventType)!;
      consumer.disconnect();
      this.consumers.delete(eventType);
    }
  }

  addFilter(eventType: string, filter: EventFilter): void {
    if (!this.filters.has(eventType)) {
      this.filters.set(eventType, []);
    }
    this.filters.get(eventType)!.push(filter);
  }

  removeFilter(eventType: string, filter: EventFilter): void {
    const filters = this.filters.get(eventType) || [];
    this.filters.set(
      eventType,
      filters.filter(f => f !== filter)
    );
  }

  private shouldPublishEvent(event: StreamEvent): boolean {
    const filters = this.filters.get(event.type) || [];
    return filters.every(filter => filter(event));
  }

  private async executeHandlers(event: StreamEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(
      handlers.map(handler =>
        handler(event).catch(error =>
          console.error(`Error executing handler for ${event.type}:`, error)
        )
      )
    );
  }

  async getEventHistory(
    eventType: string,
    options: {
      limit?: number;
      offset?: number;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<StreamEvent[]> {
    if (!this.kafka) {
      throw new Error('Event history requires Kafka');
    }

    const consumer = this.kafka.consumer({
      groupId: `history-${Date.now()}`
    });
    await consumer.connect();
    await consumer.subscribe({
      topic: eventType,
      fromBeginning: true
    });

    const events: StreamEvent[] = [];
    const startTimestamp = options.startTime?.getTime() || 0;
    const endTimestamp = options.endTime?.getTime() || Date.now();

    return new Promise((resolve, reject) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value!.toString());
          const timestamp = new Date(event.timestamp).getTime();

          if (timestamp >= startTimestamp && timestamp <= endTimestamp) {
            events.push(event);
          }

          if (options.limit && events.length >= options.limit) {
            await consumer.disconnect();
            resolve(events.slice(options.offset || 0));
          }
        }
      }).catch(reject);

      // Set timeout to prevent infinite waiting
      setTimeout(async () => {
        await consumer.disconnect();
        resolve(events.slice(options.offset || 0));
      }, 5000);
    });
  }
}
