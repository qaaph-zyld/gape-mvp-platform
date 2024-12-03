import { lazy, Suspense } from 'react';

// Lazy loading wrapper
export const lazyLoad = (importFunc) => {
  const LazyComponent = lazy(importFunc);
  return (props) => (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Image optimization
export const optimizeImage = (url, { width, height, quality = 75 }) => {
  // Implement image optimization logic
  return `${url}?w=${width}&h=${height}&q=${quality}`;
};

// Performance monitoring
export const monitorPerformance = () => {
  // Web Vitals monitoring
  if ('performance' in window) {
    window.performance.mark('app_start');
    
    // Monitor First Contentful Paint
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      console.log(`First Contentful Paint: ${fcp.startTime}ms`);
    }
    
    // Monitor Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log(`Largest Contentful Paint: ${lastEntry.startTime}ms`);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Monitor First Input Delay
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        console.log(`First Input Delay: ${entry.duration}ms`);
      });
    }).observe({ entryTypes: ['first-input'] });
  }
};

// Cache management
export const cacheManager = {
  set: (key, value, ttl = 3600) => {
    const item = {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  
  get: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const { value, timestamp, ttl } = JSON.parse(item);
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return value;
  },
  
  clear: () => {
    localStorage.clear();
  }
};

// Resource preloading
export const preloadResources = (resources) => {
  resources.forEach(resource => {
    if (resource.type === 'image') {
      const img = new Image();
      img.src = resource.url;
    } else if (resource.type === 'script') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = resource.url;
      document.head.appendChild(link);
    }
  });
};

// Performance metrics collection
export const collectMetrics = () => {
  const metrics = {};
  
  if ('performance' in window) {
    const timing = performance.timing;
    
    metrics.pageLoad = timing.loadEventEnd - timing.navigationStart;
    metrics.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
    metrics.firstByte = timing.responseStart - timing.navigationStart;
    metrics.resourceLoad = timing.loadEventEnd - timing.responseEnd;
    
    // Get resource timing data
    const resources = performance.getEntriesByType('resource');
    metrics.resourceCount = resources.length;
    metrics.totalResourceTime = resources.reduce((total, resource) => 
      total + resource.duration, 0);
  }
  
  return metrics;
};

// Error boundary for performance issues
export class PerformanceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Performance Error:', error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong. Please try again.</h1>;
    }

    return this.props.children;
  }
}
