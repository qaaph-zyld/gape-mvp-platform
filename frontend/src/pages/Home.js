import React from 'react';
import { Typography, Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mt: 8,
      }}
    >
      <Typography component="h1" variant="h2" gutterBottom>
        Welcome to GAPE MVP
      </Typography>
      <Typography variant="h5" color="text.secondary" paragraph>
        A modern, scalable application built with the GAPE development approach
      </Typography>
      {!user && (
        <Box sx={{ mt: 4 }}>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            size="large"
            sx={{ mr: 2 }}
          >
            Get Started
          </Button>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            size="large"
          >
            Sign In
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default Home;
