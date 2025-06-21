// Content analyzer service
// Processes and enhances webpage content analysis

// For encrypting content
const crypto = require('crypto');

class ContentAnalyzer {
    /**
     * Generate cache key for content
     * @param {string} url - Page URL
     * @param {Object} content - Page content
     * @returns {string} Cache key
     */
    generateCacheKey(url, content) {
        const contentString = JSON.stringify({
            url: url,
            text: content.text?.substring(0, 1000), // Use first 1000 chars for key
            wordCount: content.wordCount
        });

        return crypto.createHash('md5').update(contentString).digest('hex');
    }
}