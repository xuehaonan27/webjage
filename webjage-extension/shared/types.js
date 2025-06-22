// Shared type definitions and constants for WebJage extension
// Used by both extension and backend components

// Analysis result structure
const AnalysisResult = {
    summary: 'string',
    qualityScore: 'number', // 1-10
    credibility: 'string', // High|Medium|Low
    sentiment: 'string', // Positive|Neutral|Negative
    category: 'string', // News|Blog|Article|Product|Encyclopedia|Recipe|General
    readingTime: 'string', // "X min read"
    keyPoints: 'array', // Array of strings
    strengths: 'array', // Array of strings
    concerns: 'array', // Array of strings
    targetAudience: 'string',
    complexity: 'string', // Beginner|Intermediate|Advanced
    factualAccuracy: 'string', // High|Medium|Low|Cannot Determine
    bias: 'string', // None Detected|Slight|Moderate|Strong
    completeness: 'string', // Complete|Mostly Complete|Incomplete
    technicalMetrics: 'object',
    seoInsights: 'object',
    accessibility: 'object',
    contentFreshness: 'object',
    confidenceScore: 'number', // 0-100
    cached: 'boolean',
    timestamp: 'string'
};

// Content structure from extension
const ContentData = {
    url: 'string',
    title: 'string',
    content: {
        text: 'string',
        images: 'array', // Array of {src, alt, title}
        links: 'array', // Array of {url, text}
        wordCount: 'number'
    },
    metadata: 'object',
    contentHash: 'string',
    timestamp: 'number'
};

// Extension settings
const ExtensionSettings = {
    autoAnalyze: 'boolean',
    showFloatingWindow: 'boolean',
    apiEndpoint: 'string'
};

// API endpoints
const API_ENDPOINTS = {
    ANALYZE: '/api/analyze',
    STATS: '/api/stats',
    HEALTH: '/health',
    CACHE: '/api/cache'
};

// Message types for extension communication
const MESSAGE_TYPES = {
    ANALYZE_CONTENT: 'analyzeContent',
    GET_SETTINGS: 'getSettings',
    UPDATE_SETTINGS: 'updateSettings',
    ANALYZE_CURRENT_PAGE: 'analyzeCurrentPage',
    TOGGLE_FLOATING_WINDOW: 'toggleFloatingWindow'
};

// Export for Node.js (backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AnalysisResult,
        ContentData,
        ExtensionSettings,
        API_ENDPOINTS,
        MESSAGE_TYPES
    };
}

// Export for browser (extension)
if (typeof window !== 'undefined') {
    window.WebJageTypes = {
        AnalysisResult,
        ContentData,
        ExtensionSettings,
        API_ENDPOINTS,
        MESSAGE_TYPES
    };
}
