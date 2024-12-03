import { createTheme } from '@mui/material/styles';

// Create an accessible theme
export const accessibleTheme = createTheme({
  palette: {
    // High contrast colors
    primary: {
      main: '#1a73e8',
      dark: '#1557b0',
      light: '#62a3ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f50057',
      dark: '#ab003c',
      light: '#ff5983',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
      dark: '#9a0007',
      light: '#ff6659',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      dark: '#b28704',
      light: '#ffac33',
      contrastText: '#000000',
    },
    info: {
      main: '#0288d1',
      dark: '#01579b',
      light: '#03a9f4',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      dark: '#1b5e20',
      light: '#4caf50',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#000000',
      secondary: '#424242',
      disabled: '#757575',
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
    },
  },
  typography: {
    // Readable font sizes
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      lineHeight: 1.2,
      letterSpacing: '0em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'uppercase',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          // Larger touch targets
          minHeight: '48px',
          padding: '8px 16px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          // Clear labels and hints
          '& label': {
            fontSize: '1rem',
          },
          '& .MuiFormHelperText-root': {
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          // Larger checkboxes
          padding: '12px',
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          // Larger radio buttons
          padding: '12px',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          // Larger switches
          padding: '12px',
        },
      },
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 4,
  },
});

// Focus visible styles
export const focusVisibleStyles = {
  outline: '2px solid #1a73e8',
  outlineOffset: '2px',
};

// Skip link styles
export const skipLinkStyles = {
  position: 'absolute',
  top: '-40px',
  left: 0,
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: '8px',
  zIndex: 100,
  transition: 'top 0.3s',
  '&:focus': {
    top: 0,
  },
};

// Screen reader only styles
export const srOnlyStyles = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
