const cron = require('node-cron');
const SyncService = require('../services/syncService');
const logger = require('../utils/logger');

class SyncJob {
    static start() {
        const interval = process.env.SYNC_INTERVAL_MS || 30000; 

        this.runSync();
        cron.schedule('*/1 * * * *', async () => {
            await this.runSync();
        });

        logger.info(`⏰ Sync job scheduled to run every ${interval/1000} seconds`);
    }

    static async runSync() {
        try {
            const result = await SyncService.syncOrders();
            
            if (result.total > 0) {
                logger.info(`📊 Sync result: ${result.inserted} new orders inserted`);
            }
            
            return result;
        } catch (error) {
            logger.error(`❌ Sync job failed: ${error.message}`);
        }
    }
}

module.exports = SyncJob;