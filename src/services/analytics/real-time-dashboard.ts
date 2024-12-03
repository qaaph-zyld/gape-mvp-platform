import { Socket } from 'socket.io';
import { MetricsData, DashboardConfig, Widget, Visualization } from '../types/analytics';
import { EventStream } from '../integration/event-stream';

export class RealTimeDashboard {
  private sockets: Map<string, Socket>;
  private widgets: Map<string, Widget>;
  private eventStream: EventStream;
  private metrics: MetricsData[];
  private updateInterval: number;
  private maxDataPoints: number;

  constructor(config: DashboardConfig) {
    this.sockets = new Map();
    this.widgets = new Map();
    this.eventStream = config.eventStream;
    this.metrics = [];
    this.updateInterval = config.updateInterval || 5000;
    this.maxDataPoints = config.maxDataPoints || 1000;

    this.startMetricsCollection();
  }

  addWidget(widget: Widget): void {
    this.validateWidget(widget);
    this.widgets.set(widget.id, widget);
    this.broadcastWidgetUpdate(widget);
  }

  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.broadcastWidgetRemoval(widgetId);
  }

  updateWidget(widgetId: string, updates: Partial<Widget>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    const updatedWidget = { ...widget, ...updates };
    this.validateWidget(updatedWidget);
    this.widgets.set(widgetId, updatedWidget);
    this.broadcastWidgetUpdate(updatedWidget);
  }

  registerClient(socket: Socket): void {
    this.sockets.set(socket.id, socket);
    
    // Send initial state
    socket.emit('dashboard:init', {
      widgets: Array.from(this.widgets.values()),
      metrics: this.getRecentMetrics()
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.sockets.delete(socket.id);
    });

    // Handle widget interactions
    socket.on('widget:interact', (data: any) => {
      this.handleWidgetInteraction(socket, data);
    });
  }

  private startMetricsCollection(): void {
    // Subscribe to metrics events
    this.eventStream.subscribe('metrics', async (event) => {
      this.addMetrics(event.data);
    });

    // Start periodic updates
    setInterval(() => {
      this.broadcastMetricsUpdate();
    }, this.updateInterval);
  }

  private addMetrics(metrics: MetricsData): void {
    this.metrics.push(metrics);
    
    // Maintain max data points
    if (this.metrics.length > this.maxDataPoints) {
      this.metrics = this.metrics.slice(-this.maxDataPoints);
    }
  }

  private getRecentMetrics(duration: number = 3600000): MetricsData[] {
    const cutoff = Date.now() - duration;
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  private broadcastMetricsUpdate(): void {
    const update = {
      metrics: this.getRecentMetrics(),
      widgets: this.processWidgetUpdates()
    };

    for (const socket of this.sockets.values()) {
      socket.emit('dashboard:update', update);
    }
  }

  private broadcastWidgetUpdate(widget: Widget): void {
    for (const socket of this.sockets.values()) {
      socket.emit('widget:update', widget);
    }
  }

  private broadcastWidgetRemoval(widgetId: string): void {
    for (const socket of this.sockets.values()) {
      socket.emit('widget:remove', widgetId);
    }
  }

  private processWidgetUpdates(): any[] {
    return Array.from(this.widgets.values()).map(widget => ({
      id: widget.id,
      data: this.processWidgetData(widget)
    }));
  }

  private processWidgetData(widget: Widget): any {
    const metrics = this.getRecentMetrics(widget.timeRange);

    switch (widget.visualization) {
      case Visualization.LineChart:
        return this.processLineChartData(metrics, widget);
      case Visualization.BarChart:
        return this.processBarChartData(metrics, widget);
      case Visualization.Gauge:
        return this.processGaugeData(metrics, widget);
      case Visualization.Table:
        return this.processTableData(metrics, widget);
      default:
        return metrics;
    }
  }

  private processLineChartData(metrics: MetricsData[], widget: Widget): any {
    return {
      labels: metrics.map(m => m.timestamp),
      datasets: widget.metrics.map(metric => ({
        label: metric,
        data: metrics.map(m => m[metric as keyof MetricsData])
      }))
    };
  }

  private processBarChartData(metrics: MetricsData[], widget: Widget): any {
    // Group data by the specified interval
    const interval = widget.interval || 3600000; // 1 hour default
    const groups = new Map<number, MetricsData[]>();

    metrics.forEach(metric => {
      const timestamp = Math.floor(metric.timestamp.getTime() / interval) * interval;
      if (!groups.has(timestamp)) {
        groups.set(timestamp, []);
      }
      groups.get(timestamp)!.push(metric);
    });

    return {
      labels: Array.from(groups.keys()).map(ts => new Date(ts)),
      datasets: widget.metrics.map(metric => ({
        label: metric,
        data: Array.from(groups.values()).map(group =>
          group.reduce((sum, m) => sum + (m[metric as keyof MetricsData] as number), 0) / group.length
        )
      }))
    };
  }

  private processGaugeData(metrics: MetricsData[], widget: Widget): any {
    const latest = metrics[metrics.length - 1];
    return {
      value: latest[widget.metrics[0] as keyof MetricsData],
      min: widget.min || 0,
      max: widget.max || 100,
      thresholds: widget.thresholds
    };
  }

  private processTableData(metrics: MetricsData[], widget: Widget): any {
    return metrics.map(metric => {
      const row: any = { timestamp: metric.timestamp };
      widget.metrics.forEach(m => {
        row[m] = metric[m as keyof MetricsData];
      });
      return row;
    });
  }

  private validateWidget(widget: Widget): void {
    if (!widget.id || !widget.visualization || !widget.metrics) {
      throw new Error('Invalid widget configuration');
    }

    if (!Object.values(Visualization).includes(widget.visualization)) {
      throw new Error(`Invalid visualization type: ${widget.visualization}`);
    }

    if (widget.metrics.length === 0) {
      throw new Error('Widget must specify at least one metric');
    }
  }

  private handleWidgetInteraction(socket: Socket, data: any): void {
    const widget = this.widgets.get(data.widgetId);
    if (!widget) return;

    switch (data.type) {
      case 'timeRange':
        this.updateWidget(widget.id, { timeRange: data.value });
        break;
      case 'metrics':
        this.updateWidget(widget.id, { metrics: data.value });
        break;
      case 'visualization':
        this.updateWidget(widget.id, { visualization: data.value });
        break;
      default:
        console.warn(`Unknown widget interaction type: ${data.type}`);
    }
  }
}
