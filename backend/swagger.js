import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sankat AI Backend API',
      version: '1.0.0',
      description: 'Emergency triage backend: health check and AI-based symptom analysis endpoints.',
    },
    servers: [
      { url: 'http://localhost:5174', description: 'Local development server' },
    ],
  },
  apis: ['./server/index.js'],
}

export const swaggerSpec = swaggerJsdoc(options)
