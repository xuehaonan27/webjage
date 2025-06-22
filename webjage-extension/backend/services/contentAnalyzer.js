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
    enhanceAnalysis(aiAnalysis, originalData) {
        const enhanced = { ...aiAnalysis };

        // Add technical metrics
        enhanced.technicalMetrics = this.calculateTechnicalMetrics(originalData.content);

        // Add SEO insights
        enhanced.seoInsights = this.analyzeSEO(originalData);

        // Add accessibility notes
        enhanced.accessibility = this.analyzeAccessibility(originalData.content);

        // Add content freshness indicator
        enhanced.contentFreshness = this.analyzeContentFreshness(originalData.metadata);

        // Enhance reading time with more accurate calculation
        if (originalData.content.wordCount) {
            enhanced.readingTime = this.calculateReadingTime(originalData.content.wordCount);
        }

        // Add confidence score for the analysis
        enhanced.confidenceScore = this.calculateConfidenceScore(enhanced, originalData);

        return enhanced;
    }

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

    /**
     * Extract key phrases from text
     * @param {string} text - Text content
     * @returns {Array} Key phrases
     */
    extractKeyPhrases(text) {
        if (!text) return [];

        // Simple keyword extraction based on frequency and length
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3);

        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Get top frequent words (excluding common stop words)
        const stopWords = new Set([
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
            'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
            'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
            'such', 'take', 'than', 'them', 'well', 'were', 'what', 'your'
        ]);

        // I love Rust
        return Object.entries(wordCount)
            .filter(([word, count]) => count > 1 && !stopWords.has(word))
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }

    /**
     * Analyze text structure
     * @param {string} text - Text content
     * @returns {Object} Structure analysis
     */
    analyzeTextStructure(text) {
        if (!text) {
            return {
                paragraphs: 0,
                sentences: 0,
                avgSentenceLength: 0,
                hasHeadings: false,
                hasList: false
            };
        }

        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length > 0
            ? Math.round(text.split(/\s+/).length / sentences.length)
            : 0;

        return {
            paragraphs: paragraphs.length,
            sentences: sentences.length,
            avgSentenceLength,
            hasHeadings: /^(H[1-6]:|#)/m.test(text),
            hasList: /^[•\-\*]\s/m.test(text)
        };
    }

    /**
     * Calculate technical content metrics
     * @param {Object} content - Content object
     * @returns {Object} Technical metrics
     */
    calculateTechnicalMetrics(content) { }

    /**
     * Calculate simple readability score
     * @param {string} text - Text content
     * @returns {string} Readability level
     */
    calculateReadabilityScore(text) { }

    /**
     * Count syllables in a word (approximation)
     * @param {string} word - Word to analyze
     * @returns {number} Syllable count
     */
    countSyllables(word) { }

    /**
     * Analyze SEO aspects
     * @param {Object} data - Original content data
     * @returns {Object} SEO insights
     */
    analyzeSEO(data) { }

    /**
     * Analyze accessibility aspects
     * @param {Object} content - Content object
     * @returns {Object} Accessibility insights
     */
    analyzeAccessibility(content) { }

    /**
     * Analyze content freshness
     * @param {Object} metadata - Page metadata
     * @returns {Object} Freshness analysis
     */
    analyzeContentFreshness(metadata) { }

    /**
     * Calculate confidence score for the analysis
     * @param {Object} analysis - Enhanced analysis
     * @param {Object} originalData - Original data
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidenceScore(analysis, originalData) { }
}

module.exports = new ContentAnalyzer();
