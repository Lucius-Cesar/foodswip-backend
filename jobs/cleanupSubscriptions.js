const cron = require('node-cron');
const Subscription = require('../models/subscription');

const INACTIVITY_THRESHOLD = 30 * 24 * 60 * 60 * 1000; // 30 jours

//this is to avoid sending notifications to unused subscriptions
const cleanupInactiveSubscriptions = async () => {
  const now = Date.now();
  await Subscription.deleteMany({
    lastActivity: { $lt: new Date(now - INACTIVITY_THRESHOLD) }
  });
  console.log('Inactive subscriptions cleaned up');
};

// each first of the month at 4 AM
cron.schedule('0 4 1 * *', async () => {
    await cleanupInactiveSubscriptions();
    console.log('Cleanup job executed at 4 AM on the first day of the month');
  });

module.exports = cleanupInactiveSubscriptions;