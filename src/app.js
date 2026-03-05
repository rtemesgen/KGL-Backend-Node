const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const routes = require('./routes');
const { swaggerSpec } = require('./config/swagger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security and request parsing middleware.
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Interactive API documentation and raw OpenAPI JSON.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
	res.status(200).json(swaggerSpec);
});

// Mount all versioned API endpoints under a single base path.
app.use('/api/v1', routes);

// Keep error middleware at the end to catch unmatched routes and thrown errors.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
