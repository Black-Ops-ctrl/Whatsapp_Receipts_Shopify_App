const cron = require('node-cron');
const OrderModel = require('../models/OrderModel');
const WhatsAppService = require('../services/whatsappService');
const logger = require('../utils/logger');

class WhatsAppCron {
    static start() {
        const interval = parseInt(process.env.WHATSAPP_INTERVAL_SECONDS) || 60;

        this.processPendingOrders();

        cron.schedule(`*/${interval} * * * * *`, async () => {
            await this.processPendingOrders();
        });

        const status = WhatsAppService.getStatus();
        logger.info(`📱 WhatsApp: ${status.message}`);
        logger.info(`⏰ WhatsApp: ${interval} seconds`);
    }

    static async processPendingOrders() {
        if (!WhatsAppService.isEnabled()) return;
        if (this.isRunning) return; // prevent overlapping runs
        this.isRunning = true;

        try {
            const pending = await OrderModel.getPendingWhatsAppOrders();
            if (pending.length === 0) return;

            logger.info(`📱 Found ${pending.length} pending orders`);

            let sent = 0, failed = 0;

            for (const order of pending) {
                const result = await WhatsAppService.sendOrderConfirmation(order);

                if (result.success) {
                    await OrderModel.updateWhatsAppSent(order.order_id, result.mode);
                    sent++;
                } else {
                    await OrderModel.incrementWhatsAppAttempts(order.order_id);
                    failed++;
                }
            }

            if (sent > 0 || failed > 0) {
                logger.info(`📊 WhatsApp: ${sent} sent, ${failed} failed`);
            }

        } catch (error) {
            logger.error(`❌ WhatsApp cron: ${error.message}`);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = WhatsAppCron;