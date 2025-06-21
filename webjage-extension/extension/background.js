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
async function handleContentAnalysis(contentData, sendResponse) { }

// Get extension settings
async function getExtensionSettings(sendResponse) { }

// Update extension settings
async function updateExtensionSettings(newSettings, sendResponse) { }
