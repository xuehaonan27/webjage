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

    /**
     * Preprocess content before sending to AI
     * @param {Object} content - Raw content from extension
     * @param {Object} metadata - Page metadata
     * @returns {Object} Processed content
     */
    preprocessContent(content, metadata) {
        const processed = {
            text: this.cleanText(content.text),
            wordCount: content.wordCount || 0,
            images: content.images || [],
            links: content.links || []
        };

        // Add reading time estimation
        processed.estimatedReadingTime = this.calculateReadingTime(processed.wordCount);

        // Extract key phrases
        processed.keyPhrases = this.extractKeyPhrases(processed.text);

        // Analyze text structure
        processed.structure = this.analyzeTextStructure(processed.text);

        return processed;
    }

    /**
     * Enhance AI analysis with additional processing
     * @param {Object} aiAnalysis - Analysis from AI service
     * @param {Object} originalData - Original content data
     * @returns {Object} Enhanced analysis
     */
    enhanceAnalysis(aiAnalysis, originalData) { }

    /**
     * Clean and normalize text content
     * @param {string} text - Raw text
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            .replace(/\s+/g, ' ') // Remove excessive whitespace
            .replace(/[^\w\s\.,!?;:()\-"']/g, '') // Remove special characters that might confuse AI
            .trim(); // Trim
    }
}

module.exports = new ContentAnalyzer();
