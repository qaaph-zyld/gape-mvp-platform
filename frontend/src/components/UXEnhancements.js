import React from 'react';
import { CircularProgress, Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';

// Loading Skeleton
export const LoadingSkeleton = ({ type = 'default' }) => {
  const theme = useTheme();
  
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing(2),
    },
    progress: {
      color: theme.palette.primary.main,
    },
  };
  
  return (
    <div style={styles.container}>
      <CircularProgress style={styles.progress} />
    </div>
  );
};

// Error Boundary
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong.</h2>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Toast Notifications
export const Toast = ({ open, message, severity, onClose }) => {
  return (
    <Snackbar open={open} autoHideDuration={6000} onClose={onClose}>
      <Alert onClose={onClose} severity={severity} variant="filled">
        {message}
      </Alert>
    </Snackbar>
  );
};

// Form Validation
export const FormValidation = {
  required: value => (value ? undefined : 'This field is required'),
  email: value => (
    value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)
      ? 'Invalid email address'
      : undefined
  ),
  minLength: min => value =>
    value && value.length < min ? `Must be ${min} characters or more` : undefined,
  maxLength: max => value =>
    value && value.length > max ? `Must be ${max} characters or less` : undefined,
};

// Accessibility Enhancements
export const AccessibilityProvider = ({ children }) => {
  React.useEffect(() => {
    // Add keyboard navigation
    const handleKeyPress = (event) => {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-user');
      }
    };

    // Add focus styles
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return <>{children}</>;
};

// Progressive Enhancement
export const ProgressiveImage = ({ src, placeholder, alt }) => {
  const [loading, setLoading] = React.useState(true);
  const [currentSrc, setCurrentSrc] = React.useState(placeholder);

  React.useEffect(() => {
    const imageToLoad = new Image();
    imageToLoad.src = src;
    imageToLoad.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      style={{
        opacity: loading ? 0.5 : 1,
        transition: 'opacity 0.3s ease-in-out',
      }}
    />
  );
};

// Mobile Responsiveness
export const ResponsiveContainer = ({ children }) => {
  const theme = useTheme();
  
  const styles = {
    container: {
      padding: theme.spacing(2),
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1),
      },
      maxWidth: '100%',
      margin: '0 auto',
    },
  };
  
  return <div style={styles.container}>{children}</div>;
};

// User Feedback
export const FeedbackCollector = ({ onSubmit }) => {
  const [feedback, setFeedback] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(feedback);
    setFeedback('');
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Help us improve! Share your feedback..."
        aria-label="Feedback input"
      />
      <button type="submit">Submit Feedback</button>
    </form>
  );
};

// Performance Monitoring
export const PerformanceMonitor = ({ children }) => {
  React.useEffect(() => {
    // Monitor performance metrics
    if ('performance' in window) {
      const metrics = {
        FCP: 0,
        LCP: 0,
        FID: 0,
      };

      // First Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        metrics.FCP = entries[entries.length - 1].startTime;
        console.log('FCP:', metrics.FCP);
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        metrics.LCP = entries[entries.length - 1].startTime;
        console.log('LCP:', metrics.LCP);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        metrics.FID = entries[0].processingStart - entries[0].startTime;
        console.log('FID:', metrics.FID);
      }).observe({ entryTypes: ['first-input'] });
    }
  }, []);

  return <>{children}</>;
};
