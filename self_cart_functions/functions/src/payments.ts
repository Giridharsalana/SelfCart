import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

const db = admin.firestore();

const razorpay = new Razorpay({
  key_id: functions.config().razorpay.key_id,
  key_secret: functions.config().razorpay.key_secret
});

// Create a Razorpay order
export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId, amount, currency = 'INR' } = data;

  try {
    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: orderId,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    // Save Razorpay order ID to our order document
    await db.collection('orders').doc(orderId).update({
      razorpayOrderId: order.id,
      razorpayOrderStatus: order.status
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    };
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order', error.message);
  }
});

// Verify Razorpay payment
export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { orderId, razorpayPaymentId, razorpaySignature } = data;

  try {
    const hmac = crypto.createHmac('sha256', functions.config().razorpay.key_secret);
    hmac.update(orderId + '|' + razorpayPaymentId);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === razorpaySignature) {
      // Payment is successful
      await db.collection('orders').doc(orderId).update({
        paymentStatus: 'completed',
        paymentMethod: 'razorpay',
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true, orderId };
    } else {
      // Payment verification failed
      await db.collection('orders').doc(orderId).update({
        paymentStatus: 'failed',
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed');
    }
  } catch (error: any) {
    console.error('Razorpay payment verification failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify payment', error.message);
  }
});

// Handle Razorpay webhooks
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  const secret = functions.config().razorpay.webhook_secret;
  const signature = req.headers['x-razorpay-signature'];

  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(req.body));
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature === signature) {
      const event = req.body;
      const { entity, payload } = event;

      if (entity === 'event' && payload.payment && payload.payment.entity === 'payment') {
        const payment = payload.payment;
        const orderId = payment.order_id;

        if (payment.status === 'captured') {
          await db.collection('orders').doc(orderId).update({
            paymentStatus: 'completed',
            paymentMethod: 'razorpay',
            razorpayPaymentId: payment.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await db.collection('orders').doc(orderId).update({
            paymentStatus: 'failed',
            razorpayPaymentId: payment.id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      res.status(200).send('Webhook processed successfully');
    } else {
      res.status(400).send('Invalid signature');
    }
  } catch (err: any) {
    console.error('Razorpay webhook error:', err);
    res.status(500).send(err.message);
  }
});

export const paymentFunctions = {
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook
};