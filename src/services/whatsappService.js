const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppService {
    static isEnabled() {
        return process.env.WHATSAPP_ENABLED === 'true';
    }

    static isTestMode() {
        return process.env.WHATSAPP_TEST_MODE === 'true';
    }

    static getTestPhone() {
        return process.env.WHATSAPP_TEST_PHONE || '923044678787';
    }

    static async sendOrderConfirmation(orderData) {
        if (!this.isEnabled()) {
            logger.warn('⚠️ WhatsApp is DISABLED. Set WHATSAPP_ENABLED=true to enable.');
            return {
                success: false,
                message: 'WhatsApp is disabled. Set WHATSAPP_ENABLED=true'
            };
        }

        const isTest = this.isTestMode();
        const testPhone = this.getTestPhone();

        let recipientPhone;
        if (isTest) {
            recipientPhone = testPhone;
            logger.info(`🧪 TEST MODE: Sending to test number: ${recipientPhone}`);
        } else {
            recipientPhone = orderData.mobile_no ? '92' + orderData.mobile_no.toString() : '';
            logger.info(`📱 LIVE MODE: Sending to customer: ${recipientPhone}`);
        }

        if (!recipientPhone) {
            logger.error('❌ No recipient phone number found');
            return { success: false, message: 'No recipient phone' };
        }

        try {
            const response = await axios.post(
                process.env.WHATSAPP_API_URL,
                {
                    email: process.env.WHATSAPP_EMAIL,
                    password: process.env.WHATSAPP_PASSWORD,
                    workspaceId: process.env.WHATSAPP_WORKSPACE_ID,
                    recipientName: isTest ? 'Test User' : (orderData.customer_name || 'Customer'),
                    message: {
                        messaging_product: 'whatsapp',
                        type: 'template',
                        to: recipientPhone,
                        template: {
                            name: 'order_confirmation',
                            language: { code: 'en' },
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: isTest ? 'Test' : (orderData.customer_name || 'Customer') },
                                        { type: 'text', text: isTest ? '12345678912' : (orderData.order_id?.toString() || 'N/A') },
                                        { type: 'text', text: isTest ? 'Test Product' : (orderData.item_name || 'Items') },
                                        { type: 'text', text: isTest ? '1000.00' : (orderData.total_invoice_amount?.toString() || '0') },
                                        { type: 'text', text: isTest ? 'Test Address' : (orderData.delivery_address || 'Address') }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.WHATSAPP_BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            logger.info(`✅ WhatsApp message sent to ${recipientPhone}`);
            if (isTest) {
                logger.info('🧪 TEST MODE: Message sent to test number (not real customer)');
            }

            return {
                success: true,
                data: response.data,
                mode: isTest ? 'TEST' : 'LIVE',
                recipient: recipientPhone
            };

        } catch (error) {
            logger.error(`❌ Failed to send WhatsApp: ${error.message}`);
            if (error.response) {
                logger.error(`📡 Error response: ${JSON.stringify(error.response.data)}`);
            }
            return {
                success: false,
                error: error.message,
                mode: isTest ? 'TEST' : 'LIVE'
            };
        }
    }

    static async testConnection() {
        try {
            const response = await axios.post(
                process.env.WHATSAPP_API_URL,
                {
                    email: process.env.WHATSAPP_EMAIL,
                    password: process.env.WHATSAPP_PASSWORD,
                    workspaceId: process.env.WHATSAPP_WORKSPACE_ID,
                    recipientName: 'Test',
                    message: {
                        messaging_product: 'whatsapp',
                        type: 'template',
                        to: process.env.WHATSAPP_TEST_PHONE || '923044678787',
                        template: {
                            name: 'order_confirmation',
                            language: { code: 'en' },
                            components: [
                                {
                                    type: 'body',
                                    parameters: [
                                        { type: 'text', text: 'Test' },
                                        { type: 'text', text: '12345678912' },
                                        { type: 'text', text: 'Test Product' },
                                        { type: 'text', text: '1000.00' },
                                        { type: 'text', text: 'Test Address' }
                                    ]
                                }
                            ]
                        }
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.WHATSAPP_BEARER_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            logger.info('✅ WhatsApp API connected successfully');
            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            logger.error(`❌ WhatsApp API connection failed: ${error.message}`);
            if (error.response) {
                logger.error(`📡 Error response: ${JSON.stringify(error.response.data)}`);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    static getStatus() {
        return {
            enabled: this.isEnabled(),
            testMode: this.isTestMode(),
            testPhone: process.env.WHATSAPP_TEST_PHONE || '923044678787',
            message: this.isEnabled() 
                ? (this.isTestMode() ? '🧪 TEST MODE: Messages will go to test number' : '🔴 LIVE MODE: Messages will go to real customers')
                : '⚠️ WhatsApp is DISABLED'
        };
    }
}

module.exports = WhatsAppService;
