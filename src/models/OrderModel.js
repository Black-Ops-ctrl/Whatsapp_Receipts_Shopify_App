const pool = require('../config/database');
const logger = require('../utils/logger');

class OrderModel {
    static async createOrder(orderData) {
        const query = `
            INSERT INTO whatsapp_receipts (
                customer_name,
                sales_invoice_no,
                total_invoice_amount,
                creation_date,
                users_status,
                delivery_address,
                invoice_type,
                mobile_no,
                order_id,
                delivered_status,
                item_name,
                whatsapp_initial_sent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (order_id) DO NOTHING
            RETURNING receipt_id
        `;

        const values = [
            orderData.customer_name,
            orderData.sales_invoice_no,
            orderData.total_invoice_amount,
            orderData.creation_date,
            orderData.users_status || null,
            orderData.delivery_address,
            orderData.invoice_type,
            orderData.mobile_no,
            orderData.order_id,
            orderData.delivered_status,
            orderData.item_name,
            false
        ];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                logger.info(`✅ Order ${orderData.order_id} inserted successfully`);
                return result.rows[0].receipt_id;
            }
            return null;
        } catch (error) {
            logger.error(`❌ Error inserting order ${orderData.order_id}: ${error.message}`);
            throw error;
        }
    }

    static async orderExists(orderId) {
        const query = `SELECT 1 FROM whatsapp_receipts WHERE order_id = $1`;
        const result = await pool.query(query, [orderId]);
        return result.rows.length > 0;
    }

    static async getOrderByOrderId(orderId) {
        const query = `SELECT * FROM whatsapp_receipts WHERE order_id = $1`;
        const result = await pool.query(query, [orderId]);
        return result.rows[0];
    }

    static async updateOrder(orderData) {
        const existing = await this.getOrderByOrderId(orderData.order_id);
        
        if (!existing) {
            return null;
        }

        const norm = v => (v === undefined || v === null) ? null : String(v).trim();

        const hasChanges =
            norm(existing.customer_name) !== norm(orderData.customer_name) ||
            norm(existing.sales_invoice_no) !== norm(orderData.sales_invoice_no) ||
            parseFloat(existing.total_invoice_amount) !== parseFloat(orderData.total_invoice_amount) ||
            norm(existing.delivery_address) !== norm(orderData.delivery_address) ||
            norm(existing.invoice_type) !== norm(orderData.invoice_type) ||
            norm(existing.mobile_no) !== norm(orderData.mobile_no) ||
            norm(existing.delivered_status) !== norm(orderData.delivered_status) ||
            norm(existing.item_name) !== norm(orderData.item_name) ||
            norm(existing.users_status) !== norm(orderData.users_status);

        if (!hasChanges) {
            logger.info(`ℹ️ Order ${orderData.order_id}: No changes detected, skipping update`);
            return null;
        }

        const query = `
            UPDATE whatsapp_receipts 
            SET 
                customer_name = $1,
                sales_invoice_no = $2,
                total_invoice_amount = $3,
                creation_date = $4,
                users_status = $5,
                delivery_address = $6,
                invoice_type = $7,
                mobile_no = $8,
                delivered_status = $9,
                item_name = $10,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $11
            RETURNING *
        `;

        const values = [
            orderData.customer_name,
            orderData.sales_invoice_no,
            orderData.total_invoice_amount,
            orderData.creation_date,
            orderData.users_status || null,
            orderData.delivery_address,
            orderData.invoice_type,
            orderData.mobile_no,
            orderData.delivered_status,
            orderData.item_name,
            orderData.order_id
        ];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                logger.info(`🔄 Order ${orderData.order_id} updated: users_status = ${orderData.users_status}`);
                return result.rows[0];
            }
            return null;
        } catch (error) {
            logger.error(`❌ Error updating order ${orderData.order_id}: ${error.message}`);
            throw error;
        }
    }

    static async getPendingWhatsAppOrders() {
        const maxAgeHours = parseInt(process.env.WHATSAPP_MAX_ORDER_AGE_HOURS) || 24;
        const query = `
            SELECT * FROM whatsapp_receipts 
            WHERE whatsapp_initial_sent = FALSE
              AND whatsapp_attempts < 5
              AND creation_date >= NOW() - ($1 || ' hours')::interval
            ORDER BY inserted_at ASC
            LIMIT 50
        `;
        const result = await pool.query(query, [maxAgeHours]);
        return result.rows;
    }

    static async incrementWhatsAppAttempts(orderId) {
        await pool.query(
            `UPDATE whatsapp_receipts SET whatsapp_attempts = whatsapp_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE order_id = $1`,
            [orderId]
        );
    }

    static async updateWhatsAppSent(orderId, mode = 'LIVE') {
        const query = `
            UPDATE whatsapp_receipts 
            SET whatsapp_initial_sent = TRUE, whatsapp_sent_mode = $2, updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $1
        `;
        await pool.query(query, [orderId, mode]);
        logger.info(`✅ WhatsApp sent (${mode}) recorded for order ${orderId}`);
    }

    static async getTotalOrders() {
        const query = `SELECT COUNT(*) as total FROM whatsapp_receipts`;
        const result = await pool.query(query);
        return parseInt(result.rows[0].total);
    }
}

module.exports = OrderModel;