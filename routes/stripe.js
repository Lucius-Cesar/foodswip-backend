const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const catchAsyncErrors = require("../utils/catchAsyncErrors")
const express = require("express")
const { processOrderAfterPayment } = require("../controllers/orderController")
const router = express.Router()

// This example uses Express to receive webhooks

// Match the raw body to content type application/json
// If you are using Express v4 - v4.16 you need to use body-parser, not express, to retrieve the request body
router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  catchAsyncErrors(async (request, response) => {
    const event = request.body

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object
        // Appeler votre fonction processOrderAfterPayment avec l'objet paymentIntent
        const newOrder = await processOrderAfterPayment(paymentIntent)
        if (!newOrder) {
          throw new Error("Error processing order after payment")
        }

        break
      //case "payment_method.attached":
      // Then define and call a method to handle the successful attachment of a PaymentMethod.
      // handlePaymentMethodAttached(paymentMethod);
      //break
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true })
  })
)

module.exports = router
