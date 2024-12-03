import { ReportConfig, ReportTemplate, Report, MetricsData } from '../types/analytics';
import { EventStream } from '../integration/event-stream';
import { Storage } from '../storage/storage';

export class CustomReporting {
  private templates: Map<string, ReportTemplate>;
  private reports: Map<string, Report>;
  private eventStream: EventStream;
  private storage: Storage;

  constructor(config: ReportConfig) {
    this.templates = new Map();
    this.reports = new Map();
    this.eventStream = config.eventStream;
    this.storage = config.storage;

    this.loadTemplates();
    this.setupEventHandlers();
  }

  async createTemplate(template: ReportTemplate): Promise<string> {
    this.validateTemplate(template);
    const templateId = this.generateId('template');
    
    const newTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storage.saveTemplate(newTemplate);
    this.templates.set(templateId, newTemplate);

    return templateId;
  }

  async updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.validateTemplate(updatedTemplate);
    await this.storage.saveTemplate(updatedTemplate);
    this.templates.set(templateId, updatedTemplate);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }

    await this.storage.deleteTemplate(templateId);
    this.templates.delete(templateId);
  }

  async generateReport(
    templateId: string,
    parameters: any = {}
  ): Promise<Report> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const reportId = this.generateId('report');
    const metrics = await this.fetchMetrics(template, parameters);
    const report = await this.processReport(template, metrics, parameters);

    const finalReport = {
      ...report,
      id: reportId,
      templateId,
      parameters,
      createdAt: new Date()
    };

    await this.storage.saveReport(finalReport);
    this.reports.set(reportId, finalReport);

    return finalReport;
  }

  async scheduleReport(
    templateId: string,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time?: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
    },
    parameters: any = {}
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const scheduleId = this.generateId('schedule');
    const scheduleConfig = {
      id: scheduleId,
      templateId,
      schedule,
      parameters,
      createdAt: new Date()
    };

    await this.storage.saveSchedule(scheduleConfig);
    return scheduleId;
  }

  async getReport(reportId: string): Promise<Report> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }
    return report;
  }

  async exportReport(
    reportId: string,
    format: 'pdf' | 'csv' | 'excel'
  ): Promise<Buffer> {
    const report = await this.getReport(reportId);
    
    switch (format) {
      case 'pdf':
        return this.exportToPdf(report);
      case 'csv':
        return this.exportToCsv(report);
      case 'excel':
        return this.exportToExcel(report);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async loadTemplates(): Promise<void> {
    const templates = await this.storage.loadTemplates();
    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private setupEventHandlers(): void {
    this.eventStream.subscribe('metrics', async (event) => {
      // Handle real-time metrics for live reports
      await this.processLiveReports(event.data);
    });
  }

  private async fetchMetrics(
    template: ReportTemplate,
    parameters: any
  ): Promise<MetricsData[]> {
    const startTime = this.calculateStartTime(template.timeRange, parameters);
    const endTime = parameters.endTime || new Date();

    return await this.storage.queryMetrics({
      startTime,
      endTime,
      metrics: template.metrics,
      filters: template.filters,
      aggregation: template.aggregation
    });
  }

  private async processReport(
    template: ReportTemplate,
    metrics: MetricsData[],
    parameters: any
  ): Promise<Report> {
    const sections = await Promise.all(
      template.sections.map(async section => {
        const sectionMetrics = this.filterMetricsForSection(metrics, section);
        const visualizations = await this.generateVisualizations(
          sectionMetrics,
          section.visualizations
        );

        return {
          ...section,
          visualizations,
          summary: this.generateSectionSummary(sectionMetrics, section)
        };
      })
    );

    return {
      title: this.interpolateParameters(template.title, parameters),
      description: this.interpolateParameters(template.description, parameters),
      sections,
      summary: this.generateReportSummary(metrics, template),
      metadata: {
        generatedAt: new Date(),
        timeRange: {
          start: metrics[0]?.timestamp,
          end: metrics[metrics.length - 1]?.timestamp
        },
        parameters
      }
    };
  }

  private async processLiveReports(metrics: MetricsData): Promise<void> {
    // Update any live reports with new metrics
    const liveReports = Array.from(this.reports.values())
      .filter(report => report.metadata.live);

    for (const report of liveReports) {
      const template = this.templates.get(report.templateId);
      if (!template) continue;

      const updatedReport = await this.updateLiveReport(report, metrics, template);
      this.reports.set(report.id, updatedReport);
      
      this.eventStream.publish({
        type: 'report:updated',
        data: {
          reportId: report.id,
          updates: updatedReport
        }
      });
    }
  }

  private async updateLiveReport(
    report: Report,
    newMetrics: MetricsData,
    template: ReportTemplate
  ): Promise<Report> {
    // Update report with new metrics
    const updatedSections = await Promise.all(
      report.sections.map(async section => {
        if (!this.shouldUpdateSection(section, newMetrics)) {
          return section;
        }

        const updatedMetrics = this.updateSectionMetrics(
          section.metrics,
          newMetrics
        );

        return {
          ...section,
          metrics: updatedMetrics,
          visualizations: await this.generateVisualizations(
            updatedMetrics,
            section.visualizations
          ),
          summary: this.generateSectionSummary(updatedMetrics, section)
        };
      })
    );

    return {
      ...report,
      sections: updatedSections,
      summary: this.generateReportSummary(
        this.aggregateMetrics(updatedSections),
        template
      ),
      metadata: {
        ...report.metadata,
        updatedAt: new Date()
      }
    };
  }

  private validateTemplate(template: ReportTemplate): void {
    if (!template.title || !template.sections || template.sections.length === 0) {
      throw new Error('Invalid template configuration');
    }

    template.sections.forEach(section => {
      if (!section.title || !section.visualizations || section.visualizations.length === 0) {
        throw new Error(`Invalid section configuration in template`);
      }
    });
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateStartTime(timeRange: string, parameters: any): Date {
    if (parameters.startTime) {
      return new Date(parameters.startTime);
    }

    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Invalid time range: ${timeRange}`);
    }
  }

  private interpolateParameters(text: string, parameters: any): string {
    return text.replace(/\${(\w+)}/g, (match, key) => parameters[key] || match);
  }

  private async exportToPdf(report: Report): Promise<Buffer> {
    // Implementation for PDF export
    throw new Error('PDF export not implemented');
  }

  private async exportToCsv(report: Report): Promise<Buffer> {
    // Implementation for CSV export
    throw new Error('CSV export not implemented');
  }

  private async exportToExcel(report: Report): Promise<Buffer> {
    // Implementation for Excel export
    throw new Error('Excel export not implemented');
  }
}
