// Content script for WebJage extension
// Extracts webpage content and manages floating analysis window

class WebJageContentExtractor {
    constructor() {
        this.isAnalyzing = false; // prevent concurrent race
        this.floatingWindow = null; // the floating window
        this.settings = {
            autoAnalyze: true,
            showFloatingWindow: true
        };

        this.init();
    }

    async init() {
        // Load extension settings
        await this.loadSettings();

        // Wait for page to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onPageReady());
        } else {
            this.onPageReady();
        }
    }

    async loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
            if (response.success) {
                this.settings = { ...this.settings, ...response.settings };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    onPageReady() {
        // Skip analysis for certain pages
        if (this.shouldSkipPage()) {
            return;
        }

        // Auto-analyze if enabled
        if (this.settings.autoAnalyze) {
            // Delay analysis to ensure page is fully rendered
            setTimeout(() => this.analyzeCurrentPage(), 2000);
        }
    }

    shouldSkipPage() {
        const url = window.location.href;
        const skipPatterns = [
            /^chrome-extension:/,
            /^chrome:/,
            /^about:/,
            /^file:/,
            /google\.com\/search/,
            /bing\.com\/search/,
            /duckduckgo\.com/,
            /^https?:\/\/[^\/]*\/?$/  // Homepage with no content
        ];

        return skipPatterns.some(pattern => pattern.test(url)) ||
            document.body.innerText.trim().length < 100;
    }

    async analyzeCurrentPage() {
        if (this.isAnalyzing) {
            return;
        }

        this.isAnalyzing = true;

        try {
            // Extract page content
            const contentData = this.extractPageContent();

            // Show loading state
            this.showFloatingWindow({ loading: true });

            // Send content for analysis
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeContent',
                data: contentData
            });

            if (response.success) {
                this.displayAnalysisResult(response.data, response.cached);
            } else {
                this.showError(response.error || 'Analysis failed');
            }

        } catch (error) {
            console.error('Page analysis failed:', error);
            this.showError('Failed to analyze page content');
        } finally {
            this.isAnalyzing = false;
        }
    }

    extractPageContent() {
        const url = window.location.href;
        const title = document.title;

        // Extract main content using various strategies
        const content = this.extractMainContent();
        const metadata = this.extractMetadata();

        // Generate content hash for caching
        const contentHash = this.generateContentHash(content);

        return {
            url,
            title,
            content,
            metadata,
            contentHash,
            timestamp: Date.now()
        };
    }

    extractMainContent() {
        // Try to find main content area
        const contentSelectors = [
            'main',
            'article',
            '[role="main"]',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '#content',
            '#main'
        ];

        let mainElement = null;
        for (const selector of contentSelectors) {
            mainElement = document.querySelector(selector);
            if (mainElement) break;
        }

        // Fallback to body if no main content found
        if (!mainElement) {
            mainElement = document.body;
        }

        // Extract text content while preserving structure
        const textContent = this.extractTextWithStructure(mainElement);

        // Extract images with alt text
        const images = this.extractImages(mainElement);

        // Extract links
        const links = this.extractLinks(mainElement);

        return {
            text: textContent,
            images,
            links,
            wordCount: textContent.split(/\s+/).length
        };
    }

    extractTextWithStructure(element) {
        // Remove unwanted elements
        const unwantedSelectors = [
            'script',
            'style',
            'nav',
            'header',
            'footer',
            '.advertisement',
            '.ads',
            '.sidebar',
            '.menu',
            '.navigation'
        ];

        const clone = element.cloneNode(true);
        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Extract text with basic structure preservation
        const headings = Array.from(clone.querySelectorAll('h1, h2, h3, h4, h5, h6'))
            .map(h => `${h.tagName}: ${h.textContent.trim()}`)
            .filter(text => text.length > 3);

        const paragraphs = Array.from(clone.querySelectorAll('p'))
            .map(p => p.textContent.trim())
            .filter(text => text.length > 10);

        const listItems = Array.from(clone.querySelectorAll('li'))
            .map(li => `• ${li.textContent.trim()}`)
            .filter(text => text.length > 5);

        return [...headings, ...paragraphs, ...listItems].join('\n\n');
    }

    extractImages(element) {
        return Array.from(element.querySelectorAll('img'))
            .map(img => ({
                src: img.src,
                alt: img.alt || '',
                title: img.title || ''
            }))
            .filter(img => img.alt || img.title)
            .slice(0, 10); // Limit to first 10 images
    }

    extractLinks(element) {
        return Array.from(element.querySelectorAll('a[href]'))
            .map(link => ({
                url: link.href,
                text: link.textContent.trim()
            }))
            .filter(link => link.text && link.url.startsWith('http'))
            .slice(0, 20); // Limit to first 20 links
    }

    extractMetadata() {
        const metadata = {};

        // Meta tags
        const metaTags = document.querySelectorAll('meta[name], meta[property]');
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property');
            const content = meta.getAttribute('content');
            if (name && content) {
                metadata[name] = content;
            }
        });

        // Page language
        metadata.language = document.documentElement.lang || 'unknown';

        // Page type detection
        metadata.pageType = this.detectPageType();

        return metadata;
    }

    detectPageType() {
        const url = window.location.href;
        const title = document.title.toLowerCase();
        const content = document.body.textContent.toLowerCase();

        if (url.includes('/news/') || title.includes('news')) return 'news';
        if (url.includes('/blog/') || title.includes('blog')) return 'blog';
        if (url.includes('/article/') || content.includes('published')) return 'article';
        if (url.includes('/product/') || content.includes('price')) return 'product';
        if (url.includes('wikipedia.org')) return 'encyclopedia';
        if (content.includes('recipe') || content.includes('ingredients')) return 'recipe';

        return 'general';
    }

    generateContentHash(content) {
        // Simple hash function for content deduplication
        let hash = 0;
        const str = JSON.stringify(content);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
}