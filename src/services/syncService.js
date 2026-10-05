const ApexService = require('./apexService');
const OrderModel = require('../models/OrderModel');
const logger = require('../utils/logger');

class SyncService {
    static async syncOrders() {
        try {
            logger.info('🔄 Starting order sync...');

            const orders = await ApexService.fetchOrders();

            if (!orders || orders.length === 0) {
                logger.info('ℹ️ No orders to sync');
                return { success: true, inserted: 0, updated: 0, total: 0 };
            }

            const validOrders = orders.filter(order => order.order_id !== null);
            
            if (validOrders.length === 0) {
                logger.info('ℹ️ No valid orders found');
                return { success: true, inserted: 0, updated: 0, total: orders.length };
            }

            let insertedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            for (const order of validOrders) {
                try {
                    const exists = await OrderModel.orderExists(order.order_id);

                    if (exists) {
                        const updated = await OrderModel.updateOrder(order);
                        if (updated) {
                            updatedCount++;
                        } else {
                            skippedCount++;  
                        }
                        continue;
                    }

                    const inserted = await OrderModel.createOrder(order);
                    if (inserted) {
                        insertedCount++;
                    }

                } catch (error) {
                    logger.error(`❌ Error syncing order ${order.order_id}: ${error.message}`);
                }
            }

            logger.info(`✅ Sync complete: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${orders.length} total`);

            return {
                success: true,
                inserted: insertedCount,
                updated: updatedCount,
                skipped: skippedCount,
                total: orders.length
            };

        } catch (error) {
            logger.error(`❌ Sync failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = SyncService;