const mongoose = require("mongoose")

const SubscriptionSchema = new mongoose.Schema({
    restaurant:  { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
    endpoint: { type: String, required: true, unique: true },
    expirationTime: Number,
    keys: {
        p256dh: String,  // Public key used for encryption
        auth: String     // Authentication secret
    },
    lastActivity: Date,
})

const Subscription = mongoose.model("subscription", SubscriptionSchema)
module.exports = Subscription