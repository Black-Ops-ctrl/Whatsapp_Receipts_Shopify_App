const axios = require('axios');
const logger = require('../utils/logger');

class DispatchWhatsappService {
    static isEnabled() {
        return process.env.DISPATCH_WHATSAPP_ENABLED === 'true';
    }

    static isTestMode() {
        return process.env.WHATSAPP_TEST_MODE === 'true';
    }

    static getTestPhone() {
        return process.env.WHATSAPP_TEST_PHONE || '923044678787';
    }

    // sending format: har shakal ko 92xxxxxxxxxx banata hai (double-92 kabhi nahi)
    static normalizePhone(phone) {
        if (!phone) return null;
        let digits = String(phone).replace(/\D/g, '');
        if (digits.startsWith('0092')) digits = digits.slice(2);
        if (digits.startsWith('92')) return digits;
        if (digits.startsWith('0')) return '92' + digits.slice(1);
        return '92' + digits;
    }

    // display format: '3181055239' | '923181055239' -> '03181055239'
    static displayPhone(phone) {
        if (!phone) return 'N/A';
        let digits = String(phone).replace(/\D/g, '');
        if (digits.startsWith('0092')) digits = digits.slice(4);
        if (digits.startsWith('92')) digits = digits.slice(2);
        if (digits.startsWith('0')) return digits;
        return '0' + digits;
    }
    static clean(text, fallback = 'N/A') {
        if (text === null || text === undefined || text === '') return fallback;
        return String(text).replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim() || fallback;
    }

    static async sendDispatchMessage(order) {
        const isTest = this.isTestMode();

        // TEST MODE
        const recipient = isTest ? this.getTestPhone() : this.normalizePhone(order.mobile_no);

        if (!recipient) {
            logger.error(`❌ Dispatch: order ${order.order_id} — customer mobile missing`);
            return { success: false, mode: isTest ? 'TEST' : 'LIVE' };
        }

        if (isTest) {
            logger.info(`🧪 TEST MODE: Dispatch message to test number: ${recipient}`);
        } else {
            logger.info(`🚚 LIVE MODE: Dispatch message to customer: ${recipient} (order ${order.order_id})`);
        }

        const payload = {
            email: process.env.WHATSAPP_EMAIL,
            password: process.env.WHATSAPP_PASSWORD,
            workspaceId: process.env.WHATSAPP_WORKSPACE_ID,
            recipientName: isTest ? 'Test' : this.clean(order.customer_name, 'Customer'),
            message: {
                messaging_product: 'whatsapp',
                type: 'template',
                to: recipient,
                template: {
                    name: 'order_dispatch',
                    language: { code: 'en' },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: isTest ? 'Test' : this.clean(order.customer_name, 'Customer') },    // {{1}} name
                                { type: 'text', text: isTest ? '12345678912' : this.clean(order.order_id) },              // {{2}} Invoice no. (order_id)
                                { type: 'text', text: isTest ? '1000.00' : this.clean(order.total_invoice_amount, '0') }, // {{3}} amount
                                { type: 'text', text: isTest ? 'Test Rider' : this.clean(order.rider_name, 'Rider') },    // {{4}} Delivery Rider
                                { type: 'text', text: this.displayPhone(order.rider_mobile) }                             // {{5}} Rider Contact (0-format)
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

            logger.info(`✅ Dispatch WhatsApp sent to ${recipient} (order ${order.order_id})`);
            return { success: true, mode: isTest ? 'TEST' : 'LIVE', recipient };
        } catch (error) {
            logger.error(`❌ Failed to send dispatch WhatsApp: ${error.message}`);
            if (error.response) {
                logger.error(`📡 Error response: ${JSON.stringify(error.response.data)}`);
            }
            return { success: false, mode: isTest ? 'TEST' : 'LIVE' };
        }
    }
}

module.exports = DispatchWhatsappService;