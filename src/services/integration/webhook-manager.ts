import axios from 'axios';
import { createHmac } from 'crypto';
import { WebhookConfig, WebhookEvent, WebhookDelivery } from '../types/webhook';
import { RetryStrategy } from '../utils/retry';

export class WebhookManager {
  private webhooks: Map<string, WebhookConfig>;
  private deliveryHistory: WebhookDelivery[];
  private retryStrategy: RetryStrategy;

  constructor() {
    this.webhooks = new Map();
    this.deliveryHistory = [];
    this.retryStrategy = new RetryStrategy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000
    });
  }

  registerWebhook(config: WebhookConfig): string {
    const webhookId = this.generateWebhookId();
    this.validateWebhookConfig(config);
    
    this.webhooks.set(webhookId, {
      ...config,
      id: webhookId,
      createdAt: new Date()
    });

    return webhookId;
  }

  unregisterWebhook(webhookId: string): boolean {
    return this.webhooks.delete(webhookId);
  }

  async triggerWebhook(webhookId: string, event: WebhookEvent): Promise<WebhookDelivery> {
    const config = this.webhooks.get(webhookId);
    if (!config) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const delivery = await this.sendWebhook(config, event);
    this.deliveryHistory.push(delivery);
    this.pruneDeliveryHistory();

    return delivery;
  }

  async triggerAllWebhooks(event: WebhookEvent): Promise<WebhookDelivery[]> {
    const deliveries = await Promise.all(
      Array.from(this.webhooks.keys()).map(webhookId =>
        this.triggerWebhook(webhookId, event)
      )
    );

    return deliveries;
  }

  getWebhook(webhookId: string): WebhookConfig | undefined {
    return this.webhooks.get(webhookId);
  }

  getAllWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  getDeliveryHistory(webhookId?: string): WebhookDelivery[] {
    if (webhookId) {
      return this.deliveryHistory.filter(delivery => delivery.webhookId === webhookId);
    }
    return [...this.deliveryHistory];
  }

  updateWebhook(webhookId: string, updates: Partial<WebhookConfig>): void {
    const existing = this.webhooks.get(webhookId);
    if (!existing) {
      throw new Error(`Webhook ${webhookId} not found`);
    }

    const updated = { ...existing, ...updates };
    this.validateWebhookConfig(updated);
    this.webhooks.set(webhookId, updated);
  }

  private async sendWebhook(
    config: WebhookConfig,
    event: WebhookEvent
  ): Promise<WebhookDelivery> {
    const deliveryId = this.generateDeliveryId();
    const payload = this.buildPayload(config, event);
    const signature = this.signPayload(payload, config.secret);
    const startTime = Date.now();

    let attempt = 0;
    let error: Error | null = null;
    let response: any = null;

    while (attempt < this.retryStrategy.maxRetries) {
      try {
        response = await axios.post(config.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-ID': config.id,
            'X-Delivery-ID': deliveryId,
            'X-Event-Type': event.type,
            ...config.headers
          },
          timeout: config.timeout || 5000
        });

        return {
          id: deliveryId,
          webhookId: config.id,
          event,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          status: 'success',
          statusCode: response.status,
          attempt: attempt + 1,
          response: response.data
        };

      } catch (err) {
        error = err;
        attempt++;

        if (attempt < this.retryStrategy.maxRetries) {
          await this.retryStrategy.wait(attempt);
        }
      }
    }

    return {
      id: deliveryId,
      webhookId: config.id,
      event,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      status: 'failed',
      statusCode: error?.response?.status || 0,
      attempt: attempt,
      error: error?.message || 'Unknown error'
    };
  }

  private buildPayload(config: WebhookConfig, event: WebhookEvent): any {
    return {
      timestamp: new Date().toISOString(),
      webhook_id: config.id,
      event_type: event.type,
      data: event.data,
      metadata: config.metadata
    };
  }

  private signPayload(payload: any, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private validateWebhookConfig(config: WebhookConfig): void {
    if (!config.url || !config.url.startsWith('http')) {
      throw new Error('Invalid webhook URL');
    }

    if (!config.secret) {
      throw new Error('Webhook secret is required');
    }

    if (config.timeout && (config.timeout < 1000 || config.timeout > 30000)) {
      throw new Error('Webhook timeout must be between 1000 and 30000 ms');
    }
  }

  private generateWebhookId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeliveryId(): string {
    return `d_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pruneDeliveryHistory(): void {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoff = Date.now() - maxAge;
    this.deliveryHistory = this.deliveryHistory.filter(
      delivery => delivery.timestamp.getTime() > cutoff
    );
  }
}
