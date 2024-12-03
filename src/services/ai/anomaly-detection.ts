import * as tf from '@tensorflow/tfjs';
import { MetricsData, AnomalyDetectionResult } from '../types/analytics';

export class AnomalyDetector {
  private autoencoder: tf.LayersModel;
  private threshold: number;
  private isModelTrained: boolean = false;

  constructor() {
    // Create autoencoder architecture
    const inputDim = 10;
    const encodingDim = 5;

    // Encoder
    const input = tf.input({shape: [inputDim]});
    const encoded = tf.layers.dense({
      units: encodingDim,
      activation: 'relu',
    }).apply(input);

    // Decoder
    const decoded = tf.layers.dense({
      units: inputDim,
      activation: 'sigmoid',
    }).apply(encoded);

    this.autoencoder = tf.model({inputs: input, outputs: decoded});
    this.autoencoder.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
    });

    this.threshold = 0.1; // Initial reconstruction error threshold
  }

  async trainModel(data: MetricsData[]): Promise<void> {
    const normalizedData = this.normalizeData(data);
    const tensor = tf.tensor2d(normalizedData);

    await this.autoencoder.fit(tensor, tensor, {
      epochs: 50,
      batchSize: 32,
      shuffle: true,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
        },
      },
    });

    // Calculate threshold based on reconstruction error distribution
    const reconstructions = this.autoencoder.predict(tensor) as tf.Tensor;
    const reconstructionErrors = tf.sub(tensor, reconstructions);
    const mse = tf.mean(tf.square(reconstructionErrors), 1);
    const errors = await mse.data();
    this.threshold = this.calculateThreshold(errors);

    this.isModelTrained = true;
  }

  async detectAnomalies(newData: MetricsData[]): Promise<AnomalyDetectionResult[]> {
    if (!this.isModelTrained) {
      throw new Error('Model must be trained before detecting anomalies');
    }

    const normalizedData = this.normalizeData(newData);
    const tensor = tf.tensor2d(normalizedData);
    const reconstructions = this.autoencoder.predict(tensor) as tf.Tensor;
    const reconstructionErrors = tf.sub(tensor, reconstructions);
    const mse = tf.mean(tf.square(reconstructionErrors), 1);
    const errors = await mse.data();

    return newData.map((data, index) => ({
      timestamp: data.timestamp,
      isAnomaly: errors[index] > this.threshold,
      score: errors[index],
      metrics: data,
      threshold: this.threshold,
    }));
  }

  private normalizeData(data: MetricsData[]): number[][] {
    return data.map(d => [
      this.normalize(d.cpuUsage, 0, 100),
      this.normalize(d.memoryUsage, 0, 100),
      this.normalize(d.requestLatency, 0, 1000),
      this.normalize(d.errorRate, 0, 1),
      this.normalize(d.throughput, 0, 10000),
      this.normalize(d.concurrentUsers, 0, 1000),
      this.normalize(d.responseTime, 0, 5000),
      this.normalize(d.queueLength, 0, 100),
      this.normalize(d.networkIO, 0, 1000),
      this.normalize(d.diskIO, 0, 1000),
    ]);
  }

  private normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  private calculateThreshold(errors: Float32Array): number {
    // Calculate threshold using mean + 2 * standard deviation
    const mean = errors.reduce((a, b) => a + b) / errors.length;
    const variance = errors.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);
    return mean + 2 * stdDev;
  }

  async saveModel(path: string): Promise<void> {
    if (!this.isModelTrained) {
      throw new Error('Cannot save untrained model');
    }
    await this.autoencoder.save(`file://${path}`);
  }

  async loadModel(path: string): Promise<void> {
    this.autoencoder = await tf.loadLayersModel(`file://${path}`);
    this.isModelTrained = true;
  }

  setThreshold(newThreshold: number): void {
    this.threshold = newThreshold;
  }

  getThreshold(): number {
    return this.threshold;
  }
}
