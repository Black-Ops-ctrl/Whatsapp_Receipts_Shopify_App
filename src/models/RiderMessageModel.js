// src/models/RiderMessageModel.js
const pool = require('../config/database');
const logger = require('../utils/logger');

class RiderMessageModel {
    // 1. Insert rider message
    static async createMessage(data) {
        const query = `
            INSERT INTO rider_messages (
                sales_invoice_no, ecom_order_id, mobile_no, customer_id, customer_type,
                customer_name, address, total_invoice_amount, discount_amount,
                delivery_charges, rider_mobile, rider_name, item_name, whatsapp_sent
            )
            SELECT $1::bigint, $2::bigint, $3::varchar, $4::bigint, $5::varchar,
                   $6::text, $7::text, $8::numeric, $9::numeric,
                   $10::numeric, $11::varchar, $12::varchar, $13::text, $14::boolean
            WHERE NOT EXISTS (
                SELECT 1 FROM rider_messages
                WHERE sales_invoice_no     IS NOT DISTINCT FROM $1::bigint
                  AND ecom_order_id        IS NOT DISTINCT FROM $2::bigint
                  AND mobile_no            IS NOT DISTINCT FROM $3::varchar
                  AND customer_id          IS NOT DISTINCT FROM $4::bigint
                  AND customer_type       IS NOT DISTINCT FROM $5::varchar
                  AND customer_name        IS NOT DISTINCT FROM $6::text
                  AND address              IS NOT DISTINCT FROM $7::text
                  AND total_invoice_amount IS NOT DISTINCT FROM $8::numeric
                  AND discount_amount      IS NOT DISTINCT FROM $9::numeric
                  AND delivery_charges     IS NOT DISTINCT FROM $10::numeric
                  AND rider_mobile         IS NOT DISTINCT FROM $11::varchar
                  AND rider_name           IS NOT DISTINCT FROM $12::varchar
                  AND item_name            IS NOT DISTINCT FROM $13::text
            )
            RETURNING id
        `;

        const values = [
            data.sales_invoice_no,
            data.ecom_order_id,
            data.mobile_no,
            data.customer_id,
            data.customer_type,
            data.customer_name,
            data.address,
            data.total_invoice_amount,
            data.discount_amount,
            data.delivery_charges,
            data.rider_mobile,
            data.rider_name,
            data.item_name,
            false
        ];

        try {
            const result = await pool.query(query, values);
            if (result.rows.length > 0) {
                logger.info(`✅ Rider message ${data.sales_invoice_no} inserted`);
                return result.rows[0].id;
            }
            return null; // same row pehle se maujood — skip
        } catch (error) {
            logger.error(`❌ Error inserting rider message ${data.sales_invoice_no}: ${error.message}`);
            throw error;
        }
    }

    // 2. Get pending rider messages 
    static async getPendingMessages() {
        const query = `
            SELECT * FROM rider_messages
            WHERE whatsapp_sent = FALSE
              AND whatsapp_attempts < 5
              AND rider_mobile IS NOT NULL
              AND rider_mobile <> ''
            ORDER BY inserted_at ASC
            LIMIT 50
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    // 3. Mark as sent (records TEST/LIVE mode)
    static async markSent(id, mode = 'LIVE') {
        const query = `
            UPDATE rider_messages
            SET whatsapp_sent = TRUE, whatsapp_sent_mode = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `;
        await pool.query(query, [id, mode]);
        logger.info(`✅ Rider WhatsApp sent (${mode}) recorded for id ${id}`);
    }

    // 4. Count failed attempt
    static async incrementAttempts(id) {
        await pool.query(
            `UPDATE rider_messages SET whatsapp_attempts = whatsapp_attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        );
    }
}

module.exports = RiderMessageModel;