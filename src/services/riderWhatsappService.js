// src/services/riderWhatsappService.js
const axios = require('axios');
const logger = require('../utils/logger');

class RiderWhatsappService {
    static isEnabled() {
        return process.env.RIDER_WHATSAPP_ENABLED === 'true';
    }

    static isTestMode() {
        return process.env.WHATSAPP_TEST_MODE === 'true';
    }

    static getTestPhone() {
        return process.env.WHATSAPP_TEST_PHONE || '923044678787';
    }

    // '3181055239' | '03181055239' | '+92 318...' -> '923181055239'
    static normalizePhone(phone) {
        if (!phone) return null;
        let digits = String(phone).replace(/\D/g, '');
        if (digits.startsWith('0092')) digits = digits.slice(2);
        if (digits.startsWith('92')) return digits;
        if (digits.startsWith('0')) return '92' + digits.slice(1);
        if (digits.length === 10 && digits.startsWith('3')) return '92' + digits;
        return digits;
    }

    // WhatsApp params: new-lines/tabs allowed nahi, multiple spaces bhi nahi
    static clean(text, fallback = 'N/A') {
        if (text === null || text === undefined || text === '') return fallback;
        return String(text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || fallback;
    }

    static async sendRiderMessage(msg) {
        const isTest = this.isTestMode();

        // TEST MODE: rider ko KABHI message nahi — sirf test number pe jata hai
        const recipient = isTest ? this.getTestPhone() : this.normalizePhone(msg.rider_mobile);

        if (!recipient) {
            logger.error(`❌ Invoice ${msg.sales_invoice_no}: rider_mobile missing/invalid`);
            return { success: false, mode: isTest ? 'TEST' : 'LIVE' };
        }

        if (isTest) {
            logger.info(`🧪 TEST MODE: Sending rider message to test number: ${recipient}`);
        } else {
            logger.info(`📱 LIVE MODE: Sending to rider ${msg.rider_name || ''}: ${recipient}`);
        }

        const payload = {
            email: process.env.WHATSAPP_EMAIL,
            password: process.env.WHATSAPP_PASSWORD,
            workspaceId: process.env.WHATSAPP_WORKSPACE_ID,
            recipientName: isTest ? 'Test' : this.clean(msg.rider_name, 'Rider'),
            message: {
                messaging_product: 'whatsapp',
                type: 'template',
                to: recipient,
                template: {
                    name: 'rider_message',
                    language: { code: 'en' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: isTest ? '12345678912' : this.clean(msg.sales_invoice_no) },      // {{1}} Invoice No
                                { type: 'text', text: isTest ? 'Test Type' : this.clean(msg.customer_type) },           // {{2}} Order Type
                                { type: 'text', text: isTest ? 'Test Customer' : this.clean(msg.customer_name) },       // {{3}} Customer Name
                                { type: 'text', text: this.normalizePhone(msg.mobile_no) || 'N/A' },                    // {{4}} Customer Contact (92 format — TEST + LIVE dono)
                                { type: 'text', text: isTest ? 'Test Address' : this.clean(msg.address) },              // {{5}} Delivery Address (single line)
                                { type: 'text', text: isTest ? 'Test Rider' : this.clean(msg.rider_name) },             // {{6}} Rider/Attendant
                                { type: 'text', text: isTest ? 'Test Product' : this.clean(msg.item_name) },            // {{7}} Items
                                { type: 'text', text: isTest ? '0' : this.clean(msg.delivery_charges, '0') },           // {{8}} Delivery Charges
                                { type: 'text', text: isTest ? '0' : this.clean(msg.discount_amount, '0') },            // {{9}} Discount
                                { type: 'text', text: isTest ? '1000.00' : this.clean(msg.total_invoice_amount, '0') }  // {{10}} Net Amount to Collect
                            ]
                        }
                    ]
                }
            }
        };

        try {
            await axios.post(process.env.WHATSAPP_API_URL, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.WHATSAPP_BEARER_TOKEN}`
                },
                timeout: 30000
            });

            logger.info(`✅ Rider WhatsApp sent to ${recipient} (invoice ${msg.sales_invoice_no})`);
            return { success: true, mode: isTest ? 'TEST' : 'LIVE', recipient };
        } catch (error) {
            logger.error(`❌ Failed to send rider WhatsApp: ${error.message}`);
            if (error.response) {
                logger.error(`📡 Error response: ${JSON.stringify(error.response.data)}`);
            }
            return { success: false, mode: isTest ? 'TEST' : 'LIVE' };
        }
    }
}

module.exports = RiderWhatsappService;