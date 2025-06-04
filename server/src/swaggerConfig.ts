import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Radio Stream API',
      version: '1.0.0',
      description: 'API documentation for the Radio Stream application server.',
    },
    servers: [
      {
        url: 'http://localhost:3000', // Adjust if your server runs elsewhere
        description: 'Development server',
      },
    ],
    // Define components (like schemas) here or reference them from JSDoc annotations
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            error: {
              type: 'string',
              description: 'Optional error details',
              nullable: true,
            },
          },
          required: ['message'],
        },
        AuthCredentials: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'User password (min 6 characters recommended)',
            },
          },
          required: ['email', 'password'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message',
            },
            token: {
              type: 'string',
              description: 'JWT token for authenticated requests',
            },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'User ID' },
                email: { type: 'string', format: 'email', description: 'User email' },
              }
            }
          },
          required: ['message', 'token', 'user'],
        },
        Station: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Station ID (often same as stationuuid)' },
            stationuuid: { type: 'string', description: 'Unique station UUID from Radio Browser' },
            name: { type: 'string', description: 'Station name' },
            url: { type: 'string', description: 'Primary stream URL' },
            url_resolved: { type: 'string', description: 'Resolved stream URL (often same as url)' },
            homepage: { type: 'string', description: 'Station homepage URL' },
            favicon: { type: 'string', nullable: true, description: 'URL to station favicon' },
            tags: { type: 'string', description: 'Comma-separated list of tags/genres' },
            country: { type: 'string', description: 'Country of the station' },
            countrycode: { type: 'string', description: 'Country code (e.g., US, GB)'},
            state: { type: 'string', nullable: true, description: 'State/province of the station' },
            language: { type: 'string', description: 'Primary language of the station' },
            votes: { type: 'integer', description: 'Number of votes on Radio Browser' },
            codec: { type: 'string', description: 'Audio codec (e.g., MP3, AAC)' },
            bitrate: { type: 'integer', description: 'Stream bitrate in kbps' },
            // Add any other relevant station properties from your model/service
          },
        },
         StationList: {
          type: 'object',
          properties: {
            id: { type: 'string', format:'uuid', description: 'Unique ID of the list' },
            name: { type: 'string', description: 'Name of the station list' },
            createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
            stationIds: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                description: 'UUID of a station in the list'
              },
              description: 'Array of station UUIDs included in this list'
            }
          }
        },
        Favorite: {
            type: 'object',
            properties: {
                user_id: { type: 'string', description: 'User ID' },
                stationuuid: { type: 'string', description: 'Station UUID' },
            }
        }
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    }
  },
  // Path to the API docs (JSDoc comments)
  apis: ['./src/routes/*.ts', './src/models/*.ts'], // Scan all .ts files in routes and models
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

[end of server/src/swaggerConfig.ts]
