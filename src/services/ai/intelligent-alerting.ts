import { AlertRule, Alert, MetricsData } from '../types/analytics';
import { PredictiveAnalytics } from './predictive-analytics';
import { AnomalyDetector } from './anomaly-detection';

export class IntelligentAlerting {
  private predictiveAnalytics: PredictiveAnalytics;
  private anomalyDetector: AnomalyDetector;
  private alertRules: AlertRule[];
  private alertHistory: Alert[];
  private suppressionWindow: number; // in milliseconds

  constructor() {
    this.predictiveAnalytics = new PredictiveAnalytics();
    this.anomalyDetector = new AnomalyDetector();
    this.alertRules = [];
    this.alertHistory = [];
    this.suppressionWindow = 3600000; // 1 hour
  }

  async initialize(historicalData: MetricsData[]): Promise<void> {
    await Promise.all([
      this.predictiveAnalytics.trainModel(historicalData),
      this.anomalyDetector.trainModel(historicalData)
    ]);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
  }

  async processMetrics(metrics: MetricsData): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check traditional threshold-based rules
    const thresholdAlerts = this.checkThresholds(metrics);
    alerts.push(...thresholdAlerts);

    // Check for anomalies
    const anomalyResults = await this.anomalyDetector.detectAnomalies([metrics]);
    if (anomalyResults[0].isAnomaly) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'anomaly',
        severity: 'high',
        message: `Anomaly detected in metrics: score ${anomalyResults[0].score.toFixed(3)}`,
        timestamp: new Date(),
        metrics: metrics,
        source: 'anomaly_detector'
      });
    }

    // Check for predicted issues
    const prediction = await this.predictiveAnalytics.predictAnomaly(metrics);
    if (prediction.isAnomaly && prediction.confidence > 0.8) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'prediction',
        severity: 'warning',
        message: `Potential issue predicted with ${(prediction.confidence * 100).toFixed(1)}% confidence`,
        timestamp: new Date(),
        metrics: metrics,
        source: 'predictive_analytics'
      });
    }

    // Apply intelligent alert suppression
    const filteredAlerts = this.suppressDuplicateAlerts(alerts);

    // Correlate alerts
    const correlatedAlerts = this.correlateAlerts(filteredAlerts);

    // Update alert history
    this.alertHistory.push(...correlatedAlerts);
    this.pruneAlertHistory();

    return correlatedAlerts;
  }

  private checkThresholds(metrics: MetricsData): Alert[] {
    return this.alertRules
      .filter(rule => this.evaluateRule(rule, metrics))
      .map(rule => ({
        id: this.generateAlertId(),
        type: 'threshold',
        severity: rule.severity,
        message: rule.message,
        timestamp: new Date(),
        metrics: metrics,
        source: 'threshold_rules'
      }));
  }

  private evaluateRule(rule: AlertRule, metrics: MetricsData): boolean {
    const value = metrics[rule.metric as keyof MetricsData];
    switch (rule.operator) {
      case '>':
        return value > rule.threshold;
      case '<':
        return value < rule.threshold;
      case '>=':
        return value >= rule.threshold;
      case '<=':
        return value <= rule.threshold;
      case '==':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  private suppressDuplicateAlerts(alerts: Alert[]): Alert[] {
    const now = Date.now();
    return alerts.filter(alert => {
      const recentSimilarAlert = this.alertHistory.find(
        historical =>
          historical.type === alert.type &&
          historical.source === alert.source &&
          now - historical.timestamp.getTime() < this.suppressionWindow
      );
      return !recentSimilarAlert;
    });
  }

  private correlateAlerts(alerts: Alert[]): Alert[] {
    // Group related alerts
    const groups = new Map<string, Alert[]>();
    
    alerts.forEach(alert => {
      const key = this.getCorrelationKey(alert);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(alert);
    });

    // Combine related alerts
    return Array.from(groups.values()).map(group => {
      if (group.length === 1) {
        return group[0];
      }

      return {
        id: this.generateAlertId(),
        type: 'correlated',
        severity: this.getHighestSeverity(group),
        message: `Multiple related issues detected: ${group.map(a => a.message).join('; ')}`,
        timestamp: new Date(),
        metrics: group[0].metrics,
        source: 'alert_correlation',
        relatedAlerts: group
      };
    });
  }

  private getCorrelationKey(alert: Alert): string {
    // Create a key based on relevant metrics and timing
    return `${alert.source}_${Math.floor(alert.timestamp.getTime() / (5 * 60 * 1000))}`;
  }

  private getHighestSeverity(alerts: Alert[]): string {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    return alerts.reduce((highest, alert) => {
      const currentIndex = severityOrder.indexOf(alert.severity);
      const highestIndex = severityOrder.indexOf(highest);
      return currentIndex > highestIndex ? alert.severity : highest;
    }, 'low');
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pruneAlertHistory(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp.getTime() > cutoff
    );
  }

  getAlertHistory(): Alert[] {
    return [...this.alertHistory];
  }

  setSuppressionWindow(milliseconds: number): void {
    this.suppressionWindow = milliseconds;
  }
}
