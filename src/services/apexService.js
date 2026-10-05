const axios = require('axios');
const logger = require('../utils/logger');

const APEX_API_URL = process.env.APEX_API_URL;

class ApexService {
    static async fetchOrders() {
        try {
            logger.info('📡 Fetching orders from APEX API...');
            
            const response = await axios.get(APEX_API_URL, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
                httpsAgent: new (require('https').Agent)({
                    rejectUnauthorized: false 
                })
            });

            const orders = response.data.items || [];
            logger.info(`✅ Fetched ${orders.length} orders from APEX`);

            return orders;
        } catch (error) {
            logger.error(`❌ Error fetching orders from APEX: ${error.message}`);
            throw error;
        }
    }

    static async fetchNewOrders() {
        try {
            const allOrders = await this.fetchOrders();
            return allOrders;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ApexService;