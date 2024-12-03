import { EventEmitter } from 'events';
import { Plugin, PluginMetadata, PluginConfig } from '../types/plugin';

export class PluginSystem {
  private plugins: Map<string, Plugin>;
  private eventEmitter: EventEmitter;
  private hooks: Map<string, Function[]>;
  private configs: Map<string, PluginConfig>;

  constructor() {
    this.plugins = new Map();
    this.eventEmitter = new EventEmitter();
    this.hooks = new Map();
    this.configs = new Map();
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    if (this.plugins.has(plugin.metadata.id)) {
      throw new Error(`Plugin ${plugin.metadata.id} is already registered`);
    }

    // Validate plugin structure
    this.validatePlugin(plugin);

    // Initialize plugin
    await this.initializePlugin(plugin);

    // Register hooks
    this.registerHooks(plugin);

    // Store plugin
    this.plugins.set(plugin.metadata.id, plugin);
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    // Cleanup hooks
    this.unregisterHooks(plugin);

    // Call plugin cleanup if available
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    // Remove plugin
    this.plugins.delete(pluginId);
    this.configs.delete(pluginId);
  }

  async executeHook(hookName: string, context: any): Promise<any[]> {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];

    for (const hook of hooks) {
      try {
        const result = await hook(context);
        results.push(result);
      } catch (error) {
        console.error(`Error executing hook ${hookName}:`, error);
        results.push(null);
      }
    }

    return results;
  }

  emitEvent(eventName: string, data: any): void {
    this.eventEmitter.emit(eventName, data);
  }

  on(eventName: string, handler: Function): void {
    this.eventEmitter.on(eventName, handler);
  }

  off(eventName: string, handler: Function): void {
    this.eventEmitter.off(eventName, handler);
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  updatePluginConfig(pluginId: string, config: PluginConfig): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    this.configs.set(pluginId, {
      ...this.configs.get(pluginId),
      ...config
    });

    if (plugin.onConfigUpdate) {
      plugin.onConfigUpdate(config);
    }
  }

  getPluginConfig(pluginId: string): PluginConfig | undefined {
    return this.configs.get(pluginId);
  }

  private validatePlugin(plugin: Plugin): void {
    const requiredMetadataFields: (keyof PluginMetadata)[] = [
      'id',
      'name',
      'version',
      'description',
      'author'
    ];

    for (const field of requiredMetadataFields) {
      if (!plugin.metadata[field]) {
        throw new Error(`Plugin metadata missing required field: ${field}`);
      }
    }

    if (!plugin.initialize) {
      throw new Error('Plugin must implement initialize method');
    }
  }

  private async initializePlugin(plugin: Plugin): Promise<void> {
    try {
      // Initialize plugin with default config
      const config = {
        ...plugin.defaultConfig,
        ...this.configs.get(plugin.metadata.id)
      };

      this.configs.set(plugin.metadata.id, config);
      await plugin.initialize(this, config);

    } catch (error) {
      throw new Error(`Failed to initialize plugin ${plugin.metadata.id}: ${error.message}`);
    }
  }

  private registerHooks(plugin: Plugin): void {
    if (!plugin.hooks) return;

    for (const [hookName, handler] of Object.entries(plugin.hooks)) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }
      this.hooks.get(hookName)?.push(handler.bind(plugin));
    }
  }

  private unregisterHooks(plugin: Plugin): void {
    if (!plugin.hooks) return;

    for (const hookName of Object.keys(plugin.hooks)) {
      const hooks = this.hooks.get(hookName) || [];
      this.hooks.set(
        hookName,
        hooks.filter(hook => !hook.bind(plugin))
      );
    }
  }
}
