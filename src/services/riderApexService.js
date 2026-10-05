// src/services/riderApexService.js
const axios = require('axios');
const https = require('https');
const logger = require('../utils/logger');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

class RiderApexService {
    static async fetchRiderMessages() {
        try {
            logger.info('📡 Fetching rider messages from APEX API...');

            const response = await axios.get(process.env.RIDER_API_URL, {
                httpsAgent,
                timeout: 30000
            });

            const items = response.data.items || [];
            logger.info(`✅ Fetched ${items.length} rider messages from APEX`);
            return items;
        } catch (error) {
            logger.error(`❌ Error fetching rider messages: ${error.message}`);
            throw error;
        }
    }
}

module.exports = RiderApexService;