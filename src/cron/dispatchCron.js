// src/cron/dispatchCron.js
const cron = require('node-cron');
const DispatchModel = require('../models/DispatchModel');
const DispatchWhatsappService = require('../services/dispatchWhatsappService');
const logger = require('../utils/logger');

class DispatchCron {
    static isRunning = false;

    static start() {
        logger.info('🚚 Dispatch message cron started (every 60 seconds)');
        logger.info(`🚚 Dispatch WhatsApp: ${DispatchWhatsappService.isEnabled() ? 'ENABLED' : '⚠️ DISABLED'}`);

        this.processPending();
        cron.schedule('0 * * * * *', () => {
            this.processPending();
        });
    }

    static async processPending() {
        if (!DispatchWhatsappService.isEnabled()) return;
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const pending = await DispatchModel.getPendingDispatchOrders();
            if (pending.length === 0) return;

            logger.info(`🚚 Found ${pending.length} orders ready for dispatch message`);

            let sent = 0, failed = 0;

            for (const order of pending) {
                const result = await DispatchWhatsappService.sendDispatchMessage(order);
                if (result.success) {
                    await DispatchModel.markDispatchSent(order.order_id, result.mode);
                    sent++;
                } else {
                    await DispatchModel.incrementDispatchAttempts(order.order_id);
                    failed++;
                }
            }

            if (sent > 0 || failed > 0) {
                logger.info(`📊 Dispatch WhatsApp: ${sent} sent, ${failed} failed`);
            }
        } catch (error) {
            logger.error(`❌ Dispatch cron: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = DispatchCron;