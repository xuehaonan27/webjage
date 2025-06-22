// Background service worker for WebJage extension
// Handles API communication and manages extension state

const API_BASE_URL = 'http://localhost:3000/api';

// Extension installation handler
chrome.runtime.onInstalled.addListener(() => {
    console.log('WebJage extension installed');

    // Initialize default settings
    chrome.storage.sync.set({
        autoAnalyze: true,
        showFloatingWindow: true,
        apiEndpoint: API_BASE_URL
    });
});

// Message handler for communication between content script and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'analyzeContent':
            handleContentAnalysis(request.data, sendResponse);
            return true; // Keep message channel open for async response

        case 'getSettings':
            getExtensionSettings(sendResponse);
            return true;

        case 'updateSettings':
            updateExtensionSettings(request.settings, sendResponse);
            return true;

        default:
            console.warn('Unknown action:', request.action);
    }
});

// Handle content analysis request
async function handleContentAnalysis(contentData, sendResponse) {
    try {
        // Check if content was recently analyzed (cache check)
        const cacheKey = generateCacheKey(contentData.url, contentData.contentHash);
        const cachedResult = await getCachedAnalysis(cacheKey);

        if (cachedResult) {
            console.log('Using cached analysis for:', contentData.url);
            sendResponse({ success: true, data: cachedResult, cached: true });
            return;
        }

        // Send content to backend for AI analysis
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: contentData.url,
                title: contentData.title,
                content: contentData.content,
                metadata: contentData.metadata
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const analysisResult = await response.json();

        // Cache the result
        await cacheAnalysis(cacheKey, analysisResult);

        sendResponse({ success: true, data: analysisResult, cached: false });

    } catch (error) {
        console.error('Content analysis failed:', error);
        sendResponse({
            success: false,
            error: error.message || 'Analysis failed'
        });
    }
}

// Generate cache key for content
function generateCacheKey(url, contentHash) {
    return `analysis_${btoa(url)}_${contentHash}`;
}

// Get cached analysis result
async function getCachedAnalysis(cacheKey) {
    try {
        const result = await chrome.storage.local.get(cacheKey);
        const cached = result[cacheKey];

        if (cached && cached.timestamp) {
            // Check if cache is still valid (24 hours)
            const cacheAge = Date.now() - cached.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

            if (cacheAge < maxAge) {
                return cached.data;
            } else {
                // Remove expired cache
                chrome.storage.local.remove(cacheKey);
            }
        }

        return null;
    } catch (error) {
        console.error('Cache retrieval failed:', error);
        return null;
    }
}

// Cache analysis result
async function cacheAnalysis(cacheKey, data) {
    try {
        await chrome.storage.local.set({
            [cacheKey]: {
                data: data,
                timestamp: Date.now()
            }
        });
    } catch (error) {
        console.error('Cache storage failed:', error);
    }
}

// Get extension settings
async function getExtensionSettings(sendResponse) {
    try {
        const settings = await chrome.storage.sync.get([
            'autoAnalyze',
            'showFloatingWindow',
            'apiEndpoint'
        ]);

        sendResponse({ success: true, settings });
    } catch (error) {
        console.error('Failed to get settings:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Update extension settings
async function updateExtensionSettings(newSettings, sendResponse) {
    try {
        await chrome.storage.sync.set(newSettings);
        sendResponse({ success: true });
    } catch (error) {
        console.error('Failed to update settings:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Clean up old cache entries periodically
try {
    chrome.alarms.create('cleanupCache', { periodInMinutes: 60 });

    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'cleanupCache') {
            cleanupExpiredCache();
        }
    });
} catch (error) {
    console.warn('Failed to setup cache cleanup alarm:', error);
}

async function cleanupExpiredCache() {
    try {
        const allItems = await chrome.storage.local.get();
        const expiredKeys = [];
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        for (const [key, value] of Object.entries(allItems)) {
            if (key.startsWith('analysis_') && value.timestamp) {
                const age = Date.now() - value.timestamp;
                if (age > maxAge) {
                    expiredKeys.push(key);
                }
            }
        }

        if (expiredKeys.length > 0) {
            await chrome.storage.local.remove(expiredKeys);
            console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
    } catch (error) {
        console.error('Cache cleanup failed:', error);
    }
}
