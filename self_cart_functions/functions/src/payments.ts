import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import * as Razorpay from 'razorpay';
import * as crypto from 'crypto';

const db = admin.firestore();

// Initialize payment gateways (use environment variables in production)
const stripe = new Stripe(functions.config().stripe?.secret_key || 'sk_test_...', {
  apiVersion: '2023-10-16'
});

const razorpay = new Razorpay({
  key_id: functions.config().razorpay?.key_id || 'rzp_test_1DP5mmOlF5G5ag',
  key_secret: functions.config().razorpay?.key_secret || 'your_razorpay_secret'
});

// Create Razorpay order
export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { amount, currency = 'INR', orderId } = data;
  
  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: orderId,
      payment_capture: 1
    });
    
    // Save payment intent to Firestore
    await db.collection('paymentIntents').doc(razorpayOrder.id).set({
      orderId,
      userId: context.auth.uid,
      amount,
      currency,
      gateway: 'razorpay',
      status: 'created',
      razorpayOrderId: razorpayOrder.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status
    };
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment order');
  }
});

// Verify Razorpay payment
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { paymentId, orderId, signature } = data;
  
  try {
    // Verify signature
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', functions.config().razorpay?.key_secret || 'your_razorpay_secret')
      .update(body.toString())
      .digest('hex');
    
    if (expectedSignature !== signature) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid payment signature');
    }
    
    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    
    if (payment.status === 'captured') {
      // Update payment intent
      await db.collection('paymentIntents').doc(orderId).update({
        paymentId,
        signature,
        status: 'succeeded',
        paymentDetails: payment,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Update order payment status
      const paymentIntentDoc = await db.collection('paymentIntents').doc(orderId).get();
      if (paymentIntentDoc.exists) {
        const paymentIntent = paymentIntentDoc.data()!;
        await db.collection('orders').doc(paymentIntent.orderId).update({
          paymentStatus: 'completed',
          transactionId: paymentId,
          paymentDetails: {
            gateway: 'razorpay',
            paymentId,
            orderId,
            signature,
            amount: payment.amount / 100,
            currency: payment.currency,
            method: payment.method,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      return { success: true, paymentId, status: payment.status };
    } else {
      throw new functions.https.HttpsError('failed-precondition', 'Payment not captured');
    }
  } catch (error) {
    console.error('Razorpay payment verification failed:', error);
    
    // Update payment intent with failure
    await db.collection('paymentIntents').doc(orderId).update({
      status: 'failed',
      error: error.message,
      failedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    throw new functions.https.HttpsError('internal', 'Payment verification failed');
  }
});

// Create Stripe payment intent
export const createStripePaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { amount, currency = 'inr', orderId } = data;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency,
      metadata: {
        orderId,
        userId: context.auth.uid
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    // Save payment intent to Firestore
    await db.collection('paymentIntents').doc(paymentIntent.id).set({
      orderId,
      userId: context.auth.uid,
      amount,
      currency,
      gateway: 'stripe',
      status: paymentIntent.status,
      stripePaymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment intent');
  }
});

// Handle Stripe webhook
export const handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = functions.config().stripe?.webhook_secret;
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handleStripePaymentSuccess(paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await handleStripePaymentFailure(failedPayment);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// Handle successful Stripe payment
async function handleStripePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { orderId, userId } = paymentIntent.metadata;
  
  // Update payment intent
  await db.collection('paymentIntents').doc(paymentIntent.id).update({
    status: 'succeeded',
    paymentDetails: paymentIntent,
    succeededAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update order
  await db.collection('orders').doc(orderId).update({
    paymentStatus: 'completed',
    transactionId: paymentIntent.id,
    paymentDetails: {
      gateway: 'stripe',
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method,
      succeededAt: admin.firestore.FieldValue.serverTimestamp()
    },
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`Stripe payment succeeded for order ${orderId}`);
}

// Handle failed Stripe payment
async function handleStripePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const { orderId } = paymentIntent.metadata;
  
  // Update payment intent
  await db.collection('paymentIntents').doc(paymentIntent.id).update({
    status: 'failed',
    error: paymentIntent.last_payment_error?.message || 'Payment failed',
    failedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Update order
  await db.collection('orders').doc(orderId).update({
    paymentStatus: 'failed',
    paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log(`Stripe payment failed for order ${orderId}`);
}

// Process refund
export const processRefund = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Check if user is admin (implement your admin check logic)
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can process refunds');
  }
  
  const { orderId, amount, reason } = data;
  
  try {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }
    
    const order = orderDoc.data()!;
    const paymentDetails = order.paymentDetails;
    
    if (!paymentDetails || order.paymentStatus !== 'completed') {
      throw new functions.https.HttpsError('failed-precondition', 'Order payment not completed');
    }
    
    let refund;
    
    if (paymentDetails.gateway === 'stripe') {
      refund = await stripe.refunds.create({
        payment_intent: paymentDetails.paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: 'requested_by_customer',
        metadata: { orderId, reason }
      });
    } else if (paymentDetails.gateway === 'razorpay') {
      refund = await razorpay.payments.refund(paymentDetails.paymentId, {
        amount: amount ? Math.round(amount * 100) : undefined,
        notes: { orderId, reason }
      });
    } else {
      throw new functions.https.HttpsError('unimplemented', 'Refund not supported for this payment method');
    }
    
    // Update order with refund information
    await db.collection('orders').doc(orderId).update({
      refundStatus: 'processed',
      refundAmount: amount || order.totalAmount,
      refundId: refund.id,
      refundReason: reason,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create refund record
    await db.collection('refunds').add({
      orderId,
      userId: order.userId,
      amount: amount || order.totalAmount,
      refundId: refund.id,
      gateway: paymentDetails.gateway,
      reason,
      status: refund.status,
      processedBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, refundId: refund.id, status: refund.status };
  } catch (error) {
    console.error('Refund processing failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process refund');
  }
});

export const paymentFunctions = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createStripePaymentIntent,
  handleStripeWebhook,
  processRefund
};

