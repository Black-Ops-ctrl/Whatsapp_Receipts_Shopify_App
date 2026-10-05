require('dotenv').config();
const logger = require('./utils/logger');
const SyncJob = require('./cron/syncJob');
const WhatsAppCron = require('./cron/whatsappCron');  
const RiderJob = require('./cron/riderJob'); 
const DispatchCron = require('./cron/dispatchCron');
DispatchCron.start();
RiderJob.start(); 
SyncJob.start();
WhatsAppCron.start();                                  

logger.info('🚀 WhatsApp Receipts Sync Service Started');
logger.info(`📡 APEX API URL: ${process.env.APEX_API_URL}`);
logger.info(`⏰ Sync interval: ${process.env.SYNC_INTERVAL_MS/1000} seconds`);