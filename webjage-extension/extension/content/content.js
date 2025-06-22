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

    extractPageContent() { }
}