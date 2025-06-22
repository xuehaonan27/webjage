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

    async init() { }
}