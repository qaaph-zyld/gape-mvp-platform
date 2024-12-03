const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'GAPE MVP API',
    version: '1.0.0',
    description: 'API documentation for GAPE MVP project',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'User full name',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    description: 'User email',
                  },
                  password: {
                    type: 'string',
                    description: 'User password',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
          },
          400: {
            description: 'Validation error',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                  password: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
          },
          401: {
            description: 'Invalid credentials',
          },
        },
      },
    },
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Get user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile retrieved successfully',
          },
          401: {
            description: 'Unauthorized',
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update user profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Profile updated successfully',
          },
          400: {
            description: 'Validation error',
          },
          401: {
            description: 'Unauthorized',
          },
        },
      },
    },
  },
};

module.exports = swaggerDefinition;
