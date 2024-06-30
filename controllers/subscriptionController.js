const Subscription = require("../models/subscription")
const catchAsyncErrors = require('../utils/catchAsyncErrors');
const AppError = require('../utils/AppError');

exports.saveSubscription = catchAsyncErrors(async (req, res, next) => {
  const newSubscription = new Subscription({...req.body, restaurant: req.user.restaurant, lastActivity: Date.now()});
  const savedSubscription = await newSubscription.save();
  if(savedSubscription) {
    res.json({success: true});
  } else {
  throw new AppError('Failed to save subscription', 500, 'ErrorFailedSaveSubscription');
  }
})

exports.updateLastActivity = catchAsyncErrors(async (req, res, next) => {
  //this function will be called when user open the app, to clear unused subscriptions periodically in a cronjob
  const subscription = req.body
  const updatedSubscription = await Subscription.findOneAndUpdate({ endpoint: req.body.endpoint, restaurant: req.user.restaurant}, { lastActivity: Date.now() })
  if(updatedSubscription) {
    res.json({success: true});
  } else {
  throw new AppError('Subscription not found', 404, 'ErrorSubscriptionNotFound');
  }
})