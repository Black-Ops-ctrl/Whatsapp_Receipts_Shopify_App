// src/models/DispatchModel.js
const pool = require('../config/database');
const logger = require('../utils/logger');

class DispatchModel {
    static async getPendingDispatchOrders() {
        const query = `
            SELECT w.*, r.rider_name, r.rider_mobile
            FROM whatsapp_receipts w
            JOIN LATERAL (
                SELECT rm.rider_name, rm.rider_mobile
                FROM rider_messages rm
                WHERE rm.ecom_order_id::text = w.order_id::text
                  AND rm.rider_mobile IS NOT NULL
                  AND rm.rider_mobile <> ''
                ORDER BY rm.inserted_at DESC
                LIMIT 1
            ) r ON true
            WHERE w.delivered_status = 'PENDING'
              AND w.whatsapp_dispatch_sent = FALSE
              AND w.whatsapp_dispatch_attempts < 5
            ORDER BY w.inserted_at ASC
            LIMIT 50
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    static async markDispatchSent(orderId, mode = 'LIVE') {
        await pool.query(
            `UPDATE whatsapp_receipts
             SET whatsapp_dispatch_sent = TRUE, whatsapp_dispatch_mode = $2, updated_at = CURRENT_TIMESTAMP
             WHERE order_id = $1`,
            [orderId, mode]
        );
        logger.info(`✅ Dispatch WhatsApp (${mode}) recorded for order ${orderId}`);
    }

    static async incrementDispatchAttempts(orderId) {
        await pool.query(
            `UPDATE whatsapp_receipts
             SET whatsapp_dispatch_attempts = whatsapp_dispatch_attempts + 1, updated_at = CURRENT_TIMESTAMP
             WHERE order_id = $1`,
            [orderId]
        );
    }
}

module.exports = DispatchModel;