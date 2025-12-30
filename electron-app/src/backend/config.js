const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'config.json');
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            // First try to load from user data
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }

            // If no saved config, try to load from .env file
            const envPath = path.join(__dirname, '../../.env');
            if (fs.existsSync(envPath)) {
                return this.loadFromEnvFile(envPath);
            }

            return {};
        } catch (error) {
            console.error('Error loading config:', error);
            return {};
        }
    }

    loadFromEnvFile(envPath) {
        const content = fs.readFileSync(envPath, 'utf8');
        const config = {};

        content.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                if (key && value) {
                    config[key.trim()] = value;
                }
            }
        });

        return config;
    }

    saveConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    getConfig() {
        return this.config;
    }

    isConfigured() {
        const provider = this.config.MODEL_PROVIDER || 'claude';

        // Check common requirements
        const hasJira = !!(
            this.config.JIRA_URL &&
            this.config.JIRA_USERNAME &&
            this.config.JIRA_API_TOKEN
        );

        // Check provider-specific API key
        if (provider === 'claude') {
            return hasJira && !!this.config.ANTHROPIC_API_KEY;
        } else if (provider === 'openai') {
            return hasJira && !!this.config.OPENAI_API_KEY;
        }

        return false;
    }
}

module.exports = ConfigManager;
