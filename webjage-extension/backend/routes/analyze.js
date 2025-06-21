// API routes for content analysis
// Handles webpage content analysis requests

const express = require('express');
const router = express.Router();
const contentAnalyzer = require('../services/contentAnalyzer');
const claudeService = require('../services/claude');
const NodeCache = require('node-cache');

// Cache for analysis results (TTL: 1 hour)
const analysisCache = new NodeCache({ stdTTL: 3600 });

const TOO_SHORT_CONTENT_LENGTH = 50;
const TOO_LONG_CONTENT_LENGTH = 50000;

// Validation middleware
// Do type checks cause JavaScript is weak-typed
// Too annoying. I miss Rust.
const validateAnalysisRequest = (req, res, next) => {
    const { url, title, content } = req.body;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'URL is required and must be a string'
        });
    }

    // Check type of content itself
    if (!content || typeof content !== 'object') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Content is required and must be an object'
        });
    }

    // Check type of content's text
    if (!content.text || typeof content.text !== 'string') {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Content text is required and must be a string'
        });
    }

    if (content.text.length < TOO_SHORT_CONTENT_LENGTH) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Content text is too short for meaningful analysis (minimum 50 characters)'
        });
    }

    if (content.text.length > TOO_LONG_CONTENT_LENGTH) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'Content text is too long for analysis (maximum 50,000 characters)'
        });
    }

    next();
};

// POST /api/analyze
// Analyze webpage content
router.post('/analyze', validateAnalysisRequest, async (req, res) => {
    try {
        const { url, title, content, metadata } = req.body;

        // Generate cache key
        const cacheKey = contentAnalyzer.generateCacheKey(url, content);

        // Check cache first
        const cachedResult = analysisCache.get(cacheKey);
        if (cachedResult) {
            console.log(`Cache hit for URL: ${url}`);
            return res.json({
                ...cachedResult,
                cached: true,
                timestamp: new Date().toISOString()
            });
        }

        console.log(`Analyzing content for URL: ${url}`);

        // Prepare content for analysis
        const processedContent = contentAnalyzer.preprocessContent(content, metadata);

        // Get AI analysis from Claude
        const aiAnalysis = await claudeService.analyzeContent({
            url,
            title,
            content: processedContent,
            metadata
        });

        // Process and enhance the analysis
        const finalAnalysis = contentAnalyzer.enhanceAnalysis(aiAnalysis, {
            url,
            title,
            content,
            metadata
        });

        // Cache the result
        analysisCache.set(cacheKey, finalAnalysis);

        console.log(`Analysis completed for URL: ${url}`);

        res.json({
            ...finalAnalysis,
            cached: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Analysis error:', error);

        if (error.name === 'AnthropicError') {
            return res.status(503).json({
                error: 'AI Service Error',
                message: 'The AI analysis service is currently unavailable. Please try again later.'
            });
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'Unable to connect to analysis service. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Analysis Failed',
            message: 'An error occurred while analyzing the content. Please try again.'
        });
    }
});

// GET /api/analyze/stats
// Get analysis statistics
router.get('/stats', (req, res) => {
    const cacheStats = analysisCache.getStats();

    res.json({
        cache: {
            keys: cacheStats.keys,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
        },
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        }
    });
});

// GET /api/analyze/cache - Get cache information (development only)
router.get('/cache', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'This endpoint is only available in development mode'
        });
    }

    const keys = analysisCache.keys();
    const cacheData = {};

    keys.forEach(key => {
        const ttl = analysisCache.getTtl(key);
        cacheData[key] = {
            ttl: ttl ? new Date(ttl).toISOString() : null,
            hasData: analysisCache.has(key)
        };
    });

    res.json({
        totalKeys: keys.length,
        keys: cacheData,
        stats: analysisCache.getStats()
    });
});

// DELETE /api/analyze/cache
// Clear cache (for development)
router.delete('/cache', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'This endpoint is only available in development mode'
        });
    }

    const keysDeleted = analysisCache.keys().length;
    analysisCache.flushAll();

    res.json({
        message: 'Cache cleared successfully',
        keysDeleted
    });
});

// POST /api/analyze/batch
// Batch analyze multiple URLs (future feature)
router.post('/batch', (req, res) => {
    res.status(501).json({
        error: 'Not Implemented',
        message: 'Batch analysis is not yet implemented'
    });
});

module.exports = router;
