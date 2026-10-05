// src/cron/riderJob.js
const cron = require('node-cron');
const RiderSyncService = require('../services/riderSyncService');
const RiderWhatsappService = require('../services/riderWhatsappService');
const RiderMessageModel = require('../models/RiderMessageModel');
const logger = require('../utils/logger');

class RiderJob {
    static isRunning = false;

    static start() {
        logger.info('🏍️ Rider message job started (every 30 seconds)');
        logger.info(`🏍️ Rider WhatsApp: ${RiderWhatsappService.isEnabled() ? 'ENABLED' : '⚠️ DISABLED'}`);

        this.run();

        cron.schedule('*/30 * * * * *', () => {
            this.run();
        });
    }

    static async run() {
        if (this.isRunning) return; 
        this.isRunning = true;

        try {
            // STEP 1: APEX -> Postgres (duplicates auto-skip)
            await RiderSyncService.syncRiderMessages();

            // STEP 2: pending messages -> rider WhatsApp
            if (!RiderWhatsappService.isEnabled()) return;

            const pending = await RiderMessageModel.getPendingMessages();
            if (pending.length === 0) return;

            logger.info(`🏍️ Found ${pending.length} pending rider messages`);

            let sent = 0, failed = 0;

            for (const msg of pending) {
                const result = await RiderWhatsappService.sendRiderMessage(msg);

                if (result.success) {
                    await RiderMessageModel.markSent(msg.id, result.mode);
                    sent++;
                } else {
                    await RiderMessageModel.incrementAttempts(msg.id);
                    failed++;
                }
            }

            if (sent > 0 || failed > 0) {
                logger.info(`📊 Rider WhatsApp: ${sent} sent, ${failed} failed`);
            }
        } catch (error) {
            logger.error(`❌ Rider job error: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = RiderJob;