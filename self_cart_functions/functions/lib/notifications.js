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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationFunctions = exports.sendTopicNotification = exports.onNewNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const db = admin.firestore();
// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().gmail.email,
        pass: functions.config().gmail.password
    }
});
// Send email notification
async function sendEmail(email, subject, html) {
    const mailOptions = {
        from: `Self Cart <${functions.config().gmail.email}>`,
        to: email,
        subject,
        html
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
    }
    catch (error) {
        console.error(`Error sending email to ${email}:`, error);
    }
}
// Send push notification
async function sendPushNotification(fcmToken, title, body, data) {
    const payload = {
        notification: {
            title,
            body
        },
        data
    };
    try {
        await admin.messaging().sendToDevice(fcmToken, payload);
        console.log(`Push notification sent to token ${fcmToken}`);
    }
    catch (error) {
        console.error(`Error sending push notification to token ${fcmToken}:`, error);
    }
}
// Trigger on new notification document
exports.onNewNotification = functions.firestore
    .document('notifications/{notificationId}')
    .onCreate(async (snap, context) => {
    const notification = snap.data();
    const { type, userId, orderId } = notification;
    try {
        // Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found`);
            return;
        }
        const user = userDoc.data();
        const { email, fcmToken, preferences } = user;
        let subject = '';
        let html = '';
        let pushTitle = '';
        let pushBody = '';
        const pushData = { notificationId: context.params.notificationId };
        switch (type) {
            case 'order_confirmation':
                if (preferences === null || preferences === void 0 ? void 0 : preferences.emailOnOrder) {
                    subject = `Your Self Cart Order #${orderId} is confirmed`;
                    html = `<p>Hi ${user.displayName},</p><p>Your order #${orderId} has been confirmed. Thank you for shopping with us!</p>`;
                }
                if (preferences === null || preferences === void 0 ? void 0 : preferences.pushOnOrder) {
                    pushTitle = 'Order Confirmed';
                    pushBody = `Your order #${orderId} has been confirmed.`;
                }
                break;
            case 'order_status_update':
                const { status } = notification;
                const statusColors = {
                    processing: '#FFA500',
                    shipped: '#0000FF',
                    delivered: '#008000',
                    cancelled: '#FF0000'
                };
                if (preferences === null || preferences === void 0 ? void 0 : preferences.emailOnStatusChange) {
                    subject = `Your Self Cart Order #${orderId} has been ${status}`;
                    html = `<p>Hi ${user.displayName},</p><p>The status of your order #${orderId} has been updated to <strong style="color: ${statusColors[status] || '#000'};">${status}</strong>.</p>`;
                }
                if (preferences === null || preferences === void 0 ? void 0 : preferences.pushOnStatusChange) {
                    pushTitle = 'Order Status Updated';
                    pushBody = `Your order #${orderId} is now ${status}.`;
                }
                break;
            case 'low_stock_alert':
                const { productName, currentStock } = notification;
                if (preferences === null || preferences === void 0 ? void 0 : preferences.emailOnLowStock) {
                    subject = `Low Stock Alert: ${productName}`;
                    html = `<p>Hi Admin,</p><p>The product <strong>${productName}</strong> is running low on stock. Current stock: ${currentStock}.</p>`;
                }
                if (preferences === null || preferences === void 0 ? void 0 : preferences.pushOnLowStock) {
                    pushTitle = 'Low Stock Alert';
                    pushBody = `${productName} is low on stock (${currentStock} left).`;
                }
                break;
            // Add more cases for other notification types
        }
        // Send notifications
        const emailPromises = [];
        const pushPromises = [];
        if (email && subject && html) {
            emailPromises.push(sendEmail(email, subject, html));
        }
        if (fcmToken && pushTitle && pushBody) {
            pushPromises.push(sendPushNotification(fcmToken, pushTitle, pushBody, pushData));
        }
        await Promise.all([...emailPromises, ...pushPromises]);
    }
    catch (error) {
        console.error(`Error processing notification ${context.params.notificationId}:`, error);
    }
});
// Send notifications to a topic
exports.sendTopicNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { topic, title, body, imageUrl } = data;
    if (!topic || !title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Topic, title, and body are required');
    }
    const payload = {
        notification: Object.assign({ title,
            body }, (imageUrl && { imageUrl }))
    };
    try {
        await admin.messaging().sendToTopic(topic, payload);
        return { success: true, message: `Notification sent to topic ${topic}` };
    }
    catch (error) {
        console.error(`Error sending topic notification to ${topic}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to send topic notification', error.message);
    }
});
exports.notificationFunctions = {
    onNewNotification: exports.onNewNotification,
    sendTopicNotification: exports.sendTopicNotification
};
//# sourceMappingURL=notifications.js.map