"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentFunctions = exports.razorpayWebhook = exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
const razorpay = new razorpay_1.default({
    key_id: functions.config().razorpay.key_id,
    key_secret: functions.config().razorpay.key_secret
});
// Create a Razorpay order
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
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
    }
    catch (error) {
        console.error('Razorpay order creation failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to create Razorpay order', error.message);
    }
});
// Verify Razorpay payment
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
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
        }
        else {
            // Payment verification failed
            await db.collection('orders').doc(orderId).update({
                paymentStatus: 'failed',
                razorpayPaymentId,
                razorpaySignature,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw new functions.https.HttpsError('invalid-argument', 'Payment verification failed');
        }
    }
    catch (error) {
        console.error('Razorpay payment verification failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to verify payment', error.message);
    }
});
// Handle Razorpay webhooks
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
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
                }
                else {
                    await db.collection('orders').doc(orderId).update({
                        paymentStatus: 'failed',
                        razorpayPaymentId: payment.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            res.status(200).send('Webhook processed successfully');
        }
        else {
            res.status(400).send('Invalid signature');
        }
    }
    catch (err) {
        console.error('Razorpay webhook error:', err);
        res.status(500).send(err.message);
    }
});
exports.paymentFunctions = {
    createRazorpayOrder: exports.createRazorpayOrder,
    verifyRazorpayPayment: exports.verifyRazorpayPayment,
    razorpayWebhook: exports.razorpayWebhook
};
//# sourceMappingURL=payments.js.map