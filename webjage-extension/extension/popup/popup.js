// Popup script for WebJage extension
// Handles popup interface interactions and settings management

class WebJagePopup {
    constructor() {
        this.currentTab = null;
        this.settings = {
            autoAnalyze: true,
            showFloatingWindow: true
        };
        this.stats = {
            pagesAnalyzed: 0,
            cacheHits: 0
        };

        this.init();
    }

    async init() {
        // Get current tab
        await this.getCurrentTab();

        // Load settings and stats
        await this.loadSettings();
        await this.loadStats();

        // Setup event listeners
        this.setupEventListeners();

        // Update UI
        this.updateUI();

        // Load recent analysis
        this.loadRecentAnalysis();
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
        } catch (error) {
            console.error('Failed to get current tab:', error);
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

    async loadStats() {
        try {
            const result = await chrome.storage.local.get(['stats']);
            if (result.stats) {
                this.stats = { ...this.stats, ...result.stats };
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    setupEventListeners() {
        // Analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.addEventListener('click', () => this.analyzeCurrentPage());

        // Toggle window button
        const toggleWindowBtn = document.getElementById('toggleWindowBtn');
        toggleWindowBtn.addEventListener('click', () => this.toggleFloatingWindow());

        // Settings toggles
        const autoAnalyzeToggle = document.getElementById('autoAnalyzeToggle');
        autoAnalyzeToggle.addEventListener('change', (e) => {
            this.updateSetting('autoAnalyze', e.target.checked);
        });

        const showWindowToggle = document.getElementById('showWindowToggle');
        showWindowToggle.addEventListener('change', (e) => {
            this.updateSetting('showFloatingWindow', e.target.checked);
        });

        // Footer links
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openHelpPage();
        });

        document.getElementById('settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettingsPage();
        });

        document.getElementById('aboutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showAboutDialog();
        });
    }

    updateUI() {
        // Update status
        this.updateStatus();

        // Update settings toggles
        document.getElementById('autoAnalyzeToggle').checked = this.settings.autoAnalyze;
        document.getElementById('showWindowToggle').checked = this.settings.showFloatingWindow;

        // Update stats
        document.getElementById('pagesAnalyzed').textContent = this.stats.pagesAnalyzed;
        document.getElementById('cacheHits').textContent = this.stats.cacheHits;

        // Update analyze button state
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (this.shouldSkipCurrentPage()) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<span class="btn-icon">⚠️</span>Page not supported';
        } else {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<span class="btn-icon">🔍</span>Analyze Current Page';
        }
    }

    updateStatus() {
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (!this.currentTab) {
            statusDot.className = 'status-dot error';
            statusText.textContent = 'No active tab';
            return;
        }

        if (this.shouldSkipCurrentPage()) {
            statusDot.className = 'status-dot warning';
            statusText.textContent = 'Page not supported';
            return;
        }

        statusDot.className = 'status-dot';
        statusText.textContent = 'Ready to analyze';
    }

    shouldSkipCurrentPage() {
        if (!this.currentTab || !this.currentTab.url) {
            return true;
        }

        const url = this.currentTab.url;
        const skipPatterns = [
            /^chrome-extension:/,
            /^chrome:/,
            /^about:/,
            /^file:/,
            /^moz-extension:/,
            /^edge:/
        ];

        return skipPatterns.some(pattern => pattern.test(url));
    }

    async analyzeCurrentPage() {
        if (!this.currentTab || this.shouldSkipCurrentPage()) {
            return;
        }

        const analyzeBtn = document.getElementById('analyzeBtn');
        const originalContent = analyzeBtn.innerHTML;

        try {
            // Show loading state
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<span class="btn-icon">⏳</span>Analyzing...';

            // Send message to content script
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'analyzeCurrentPage'
            });

            if (response && response.success) {
                // Update stats
                this.stats.pagesAnalyzed++;
                await this.saveStats();
                this.updateUI();

                // Show success feedback
                analyzeBtn.innerHTML = '<span class="btn-icon">✅</span>Analysis Complete';
                setTimeout(() => {
                    analyzeBtn.innerHTML = originalContent;
                    analyzeBtn.disabled = false;
                }, 2000);
            } else {
                throw new Error('Analysis failed');
            }

        } catch (error) {
            console.error('Failed to analyze page:', error);

            // Show error feedback
            analyzeBtn.innerHTML = '<span class="btn-icon">❌</span>Analysis Failed';
            setTimeout(() => {
                analyzeBtn.innerHTML = originalContent;
                analyzeBtn.disabled = false;
            }, 2000);
        }
    }

    async toggleFloatingWindow() {
        if (!this.currentTab || this.shouldSkipCurrentPage()) {
            return;
        }

        try {
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'toggleFloatingWindow'
            });
        } catch (error) {
            console.error('Failed to toggle floating window:', error);
        }
    }

    async updateSetting(key, value) {
        this.settings[key] = value;

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: { [key]: value }
            });

            if (!response.success) {
                console.error('Failed to update setting:', response.error);
                // Revert UI change
                document.getElementById(`${key}Toggle`).checked = !value;
            }
        } catch (error) {
            console.error('Failed to update setting:', error);
            // Revert UI change
            document.getElementById(`${key}Toggle`).checked = !value;
        }
    }

    async saveStats() {
        try {
            await chrome.storage.local.set({ stats: this.stats });
        } catch (error) {
            console.error('Failed to save stats:', error);
        }
    }

    async loadRecentAnalysis() {
        try {
            const result = await chrome.storage.local.get(['recentAnalysis']);
            const recentList = result.recentAnalysis || [];

            const container = document.getElementById('recentAnalysis');

            if (recentList.length === 0) {
                container.innerHTML = '<div class="no-recent">No recent analysis</div>';
                return;
            }

            container.innerHTML = recentList
                .slice(0, 5) // Show only last 5
                .map(item => this.createRecentItem(item))
                .join('');

        } catch (error) {
            console.error('Failed to load recent analysis:', error);
        }
    }

    createRecentItem(item) {
        const favicon = item.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23f0f0f0"/></svg>';
        const title = item.title || 'Untitled';
        const url = item.url || '';
        const score = item.qualityScore || 'N/A';

        return `
        <div class="recent-item">
          <img src="${favicon}" alt="" class="recent-favicon" onerror="this.style.display='none'">
          <div class="recent-info">
            <div class="recent-title">${this.escapeHtml(title)}</div>
            <div class="recent-url">${this.escapeHtml(this.shortenUrl(url))}</div>
          </div>
          <div class="recent-score">${score}/10</div>
        </div>
      `;
    }

    shortenUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url.length > 30 ? url.substring(0, 30) + '...' : url;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    openHelpPage() {
        chrome.tabs.create({
            url: 'https://github.com/webjage/extension/wiki/help'
        });
    }

    openSettingsPage() {
        chrome.runtime.openOptionsPage();
    }

    showAboutDialog() {
        const aboutInfo = `
  WebJage AI Analysis Extension v1.0.0
  
  An intelligent browser extension that analyzes webpage content using AI to provide summaries, quality scores, and insights.
  
  Features:
  • Automatic content analysis
  • AI-powered summaries and ratings
  • Floating analysis window
  • Content caching for performance
  • Multi-dimensional analysis
  
  Developed with ❤️ for better web browsing.
      `;

        alert(aboutInfo);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WebJagePopup();
});

// Handle popup visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh data when popup becomes visible
        const popup = new WebJagePopup();
    }
});
