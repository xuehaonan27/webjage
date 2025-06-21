// Claude AI service integration
// Handles communication with Anthropic's Claude API for content analysis

const Anthropic = require('@anthropic-ai/sdk');

class ClaudeService {
    constructor() {
        this.client = new Anthropic({
            baseURL: process.env.ANTHROPIC_BASE_URL,
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        this.model = 'claude-3-haiku-20240307'; // Fast and cost-effective model
        this.maxTokens = 1000;
    }
}