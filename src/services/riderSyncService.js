// src/services/riderSyncService.js
const RiderApexService = require('./riderApexService');
const RiderMessageModel = require('../models/RiderMessageModel');
const logger = require('../utils/logger');

class RiderSyncService {
    static async syncRiderMessages() {
        try {
            const items = await RiderApexService.fetchRiderMessages();

            let inserted = 0;
            let skipped = 0;

            for (const item of items) {
                if (item.sales_invoice_no === null || item.sales_invoice_no === undefined) {
                    continue;
                }

                try {
                    const id = await RiderMessageModel.createMessage(item);
                    if (id) {
                        inserted++;
                    } else {
                        skipped++; // duplicate invoice
                    }
                } catch (error) {
                    logger.error(`❌ Rider sync error for invoice ${item.sales_invoice_no}: ${error.message}`);
                }
            }

            if (inserted > 0) {
                logger.info(`✅ Rider sync: ${inserted} inserted, ${skipped} skipped (duplicates)`);
            }

            return { success: true, inserted, skipped };
        } catch (error) {
            logger.error(`❌ Rider sync failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

module.exports = RiderSyncService;