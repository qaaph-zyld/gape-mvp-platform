import * as tf from '@tensorflow/tfjs';
import { LogisticRegression } from '@tensorflow/tfjs-layers';
import { MetricsData, PredictionResult } from '../types/analytics';

export class PredictiveAnalytics {
  private model: LogisticRegression;
  private isModelTrained: boolean = false;

  constructor() {
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  async trainModel(historicalData: MetricsData[]): Promise<void> {
    const { inputs, labels } = this.preprocessData(historicalData);
    
    await this.model.fit(inputs, labels, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });

    this.isModelTrained = true;
  }

  async predictAnomaly(currentMetrics: MetricsData): Promise<PredictionResult> {
    if (!this.isModelTrained) {
      throw new Error('Model must be trained before making predictions');
    }

    const input = this.preprocessSingleDataPoint(currentMetrics);
    const prediction = await this.model.predict(input) as tf.Tensor;
    const probability = await prediction.data();

    return {
      isAnomaly: probability[0] > 0.5,
      confidence: probability[0],
      timestamp: new Date(),
      metrics: currentMetrics
    };
  }

  async detectTrends(timeSeriesData: MetricsData[]): Promise<any> {
    const movingAverage = this.calculateMovingAverage(timeSeriesData);
    const trends = this.analyzeTrends(movingAverage);
    
    return {
      trends,
      movingAverage,
      forecast: await this.generateForecast(timeSeriesData)
    };
  }

  private preprocessData(data: MetricsData[]): { inputs: tf.Tensor; labels: tf.Tensor } {
    const inputs = data.map(d => [
      d.cpuUsage,
      d.memoryUsage,
      d.requestLatency,
      d.errorRate,
      d.throughput,
      d.concurrentUsers,
      d.responseTime,
      d.queueLength,
      d.networkIO,
      d.diskIO
    ]);

    const labels = data.map(d => d.hadIncident ? 1 : 0);

    return {
      inputs: tf.tensor2d(inputs),
      labels: tf.tensor1d(labels)
    };
  }

  private preprocessSingleDataPoint(data: MetricsData): tf.Tensor {
    return tf.tensor2d([
      [
        data.cpuUsage,
        data.memoryUsage,
        data.requestLatency,
        data.errorRate,
        data.throughput,
        data.concurrentUsers,
        data.responseTime,
        data.queueLength,
        data.networkIO,
        data.diskIO
      ]
    ]);
  }

  private calculateMovingAverage(data: MetricsData[], window: number = 10): number[] {
    const values = data.map(d => d.value);
    const result = [];
    
    for (let i = window - 1; i < values.length; i++) {
      const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
    
    return result;
  }

  private analyzeTrends(movingAverage: number[]): any {
    const trends = {
      increasing: 0,
      decreasing: 0,
      stable: 0
    };

    for (let i = 1; i < movingAverage.length; i++) {
      const diff = movingAverage[i] - movingAverage[i - 1];
      if (Math.abs(diff) < 0.1) {
        trends.stable++;
      } else if (diff > 0) {
        trends.increasing++;
      } else {
        trends.decreasing++;
      }
    }

    return trends;
  }

  private async generateForecast(data: MetricsData[]): Promise<number[]> {
    const values = data.map(d => d.value);
    const forecast = [];
    const forecastSteps = 10;

    // Simple exponential smoothing
    const alpha = 0.3;
    let lastValue = values[values.length - 1];

    for (let i = 0; i < forecastSteps; i++) {
      const nextValue = alpha * lastValue + (1 - alpha) * values[values.length - 1];
      forecast.push(nextValue);
      lastValue = nextValue;
    }

    return forecast;
  }

  async saveModel(path: string): Promise<void> {
    if (!this.isModelTrained) {
      throw new Error('Cannot save untrained model');
    }
    await this.model.save(`file://${path}`);
  }

  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
    this.isModelTrained = true;
  }
}
