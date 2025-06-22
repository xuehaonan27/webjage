// Content analyzer service
// Processes and enhances webpage content analysis

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
     * Calculate estimated reading time
     * @param {number} wordCount - Number of words
     * @returns {string} Reading time estimate
     */
    calculateReadingTime(wordCount) {
        if (!wordCount || wordCount < 1) {
            return '< 1 min read';
        }

        // Average reading speed: 200-250 words per minute
        const wordsPerMinute = 225;
        const minutes = Math.ceil(wordCount / wordsPerMinute);

        if (minutes === 1) {
            return '1 min read';
        } else if (minutes < 60) {
            return `${minutes} min read`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m read`;
        }
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
    calculateTechnicalMetrics(content) {
        const text = content.text || '';
        const words = text.split(/\s+/).filter(w => w.length > 0);

        return {
            wordCount: words.length,
            characterCount: text.length,
            averageWordLength: words.length > 0
                ? Math.round(words.reduce((sum, word) => sum + word.length, 0) / words.length)
                : 0,
            imageCount: content.images?.length || 0,
            linkCount: content.links?.length || 0,
            readabilityScore: this.calculateReadabilityScore(text)
        };
    }

    /**
     * Calculate simple readability score
     * @param {string} text - Text content
     * @returns {string} Readability level
     */
    calculateReadabilityScore(text) {
        if (!text) return 'Unknown';

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const syllables = words.reduce((count, word) => {
            return count + this.countSyllables(word);
        }, 0);

        if (sentences.length === 0 || words.length === 0) return 'Unknown';

        // Simplified Flesch Reading Ease approximation
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;

        const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

        if (score >= 90) return 'Very Easy';
        if (score >= 80) return 'Easy';
        if (score >= 70) return 'Fairly Easy';
        if (score >= 60) return 'Standard';
        if (score >= 50) return 'Fairly Difficult';
        if (score >= 30) return 'Difficult';
        return 'Very Difficult';
    }

    /**
     * Count syllables in a word (approximation)
     * @param {string} word - Word to analyze
     * @returns {number} Syllable count
     */
    countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;

        const vowels = 'aeiouy';
        let count = 0;
        let previousWasVowel = false;

        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                count++;
            }
            previousWasVowel = isVowel;
        }

        // Adjust for silent 'e'
        if (word.endsWith('e')) count--;

        return Math.max(1, count);
    }

    /**
     * Analyze SEO aspects
     * @param {Object} data - Original content data
     * @returns {Object} SEO insights
     */
    analyzeSEO(data) {
        const title = data.title || '';
        const content = data.content || {};
        const metadata = data.metadata || {};

        return {
            titleLength: title.length,
            titleOptimal: title.length >= 30 && title.length <= 60,
            hasMetaDescription: !!metadata.description,
            metaDescriptionLength: metadata.description?.length || 0,
            metaDescriptionOptimal: metadata.description &&
                metadata.description.length >= 120 &&
                metadata.description.length <= 160,
            hasHeadings: content.text?.includes('H1:') || content.text?.includes('H2:'),
            imageAltTextRatio: content.images?.length > 0
                ? content.images.filter(img => img.alt).length / content.images.length
                : 0
        };
    }

    /**
     * Analyze accessibility aspects
     * @param {Object} content - Content object
     * @returns {Object} Accessibility insights
     */
    analyzeAccessibility(content) {
        return {
            hasImageAltText: content.images?.some(img => img.alt) || false,
            imageAltTextCoverage: content.images?.length > 0
                ? Math.round((content.images.filter(img => img.alt).length / content.images.length) * 100)
                : 100,
            hasDescriptiveLinks: content.links?.some(link =>
                link.text && link.text.length > 5 &&
                !['click here', 'read more', 'more'].includes(link.text.toLowerCase())
            ) || false,
            estimatedReadingLevel: this.calculateReadabilityScore(content.text)
        };
    }

    /**
     * Analyze content freshness
     * @param {Object} metadata - Page metadata
     * @returns {Object} Freshness analysis
     */
    analyzeContentFreshness(metadata) {
        const publishDate = metadata?.['article:published_time'] ||
            metadata?.['datePublished'] ||
            metadata?.['date'];

        if (!publishDate) {
            return {
                hasPublishDate: false,
                freshness: 'Unknown'
            };
        }

        try {
            const pubDate = new Date(publishDate);
            const now = new Date();
            const daysDiff = Math.floor((now - pubDate) / (1000 * 60 * 60 * 24));

            let freshness;
            if (daysDiff <= 7) freshness = 'Very Fresh';
            else if (daysDiff <= 30) freshness = 'Fresh';
            else if (daysDiff <= 90) freshness = 'Recent';
            else if (daysDiff <= 365) freshness = 'Somewhat Old';
            else freshness = 'Old';

            return {
                hasPublishDate: true,
                publishDate: pubDate.toISOString(),
                daysOld: daysDiff,
                freshness
            };
        } catch (error) {
            return {
                hasPublishDate: false,
                freshness: 'Unknown'
            };
        }
    }

    /**
     * Calculate confidence score for the analysis
     * @param {Object} analysis - Enhanced analysis
     * @param {Object} originalData - Original data
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidenceScore(analysis, originalData) {
        let score = 50; // Base score

        // Increase confidence based on content length
        const wordCount = originalData.content.wordCount || 0;
        if (wordCount > 500) score += 20;
        else if (wordCount > 200) score += 10;
        else if (wordCount < 50) score -= 20;

        // Increase confidence if we have metadata
        if (originalData.metadata && Object.keys(originalData.metadata).length > 3) {
            score += 10;
        }

        // Increase confidence if content has structure
        if (analysis.technicalMetrics?.imageCount > 0) score += 5;
        if (analysis.technicalMetrics?.linkCount > 0) score += 5;

        // Decrease confidence for very short or very long content
        if (wordCount > 10000) score -= 10;

        return Math.max(0, Math.min(100, score));
    }
}

module.exports = new ContentAnalyzer();
