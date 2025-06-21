// WebJage Backend Server with Express.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const contentAnalyzer = require('./services/contentAnalyzer');
const claudeService = require('./services/claude');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: ['chrome-extension://*', 'moz-extension://*', 'http://localhost:*'],
    credentials: true
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
// In case of blowing up my API key during test
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Routes
app.use('/api', require('./routes/analyze'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Request payload too large',
            message: 'The content you are trying to analyze is too large. Please try with a smaller page.'
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }

    if (err.status === 429) {
        return res.status(429).json({
            error: 'Rate Limit Exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: err.retryAfter
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 WebJage Backend Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);

    // Check if Claude API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️  Warning: ANTHROPIC_API_KEY not found in environment variables');
        console.warn('   Please create a .env file with your Claude API key');
    } else {
        console.log('✅ Claude API key configured');
    }
});

module.exports = app;
