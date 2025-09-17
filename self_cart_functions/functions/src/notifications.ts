import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

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
async function sendEmail(email: string, subject: string, html: string) {
  const mailOptions = {
    from: `Self Cart <${functions.config().gmail.email}>`,
    to: email,
    subject,
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (error: any) {
    console.error(`Error sending email to ${email}:`, error);
  }
}

// Send push notification
async function sendPushNotification(fcmToken: string, title: string, body: string, data: { [key: string]: string }) {
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
  } catch (error) {
    console.error(`Error sending push notification to token ${fcmToken}:`, error);
  }
}

// Trigger on new notification document
export const onNewNotification = functions.firestore
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
      const user = userDoc.data()!;
      const { email, fcmToken, preferences } = user;

      let subject = '';
      let html = '';
      let pushTitle = '';
      let pushBody = '';
      const pushData = { notificationId: context.params.notificationId };

      switch (type) {
        case 'order_confirmation':
          if (preferences?.emailOnOrder) {
            subject = `Your Self Cart Order #${orderId} is confirmed`;
            html = `<p>Hi ${user.displayName},</p><p>Your order #${orderId} has been confirmed. Thank you for shopping with us!</p>`;
          }
          if (preferences?.pushOnOrder) {
            pushTitle = 'Order Confirmed';
            pushBody = `Your order #${orderId} has been confirmed.`;
          }
          break;

        case 'order_status_update':
          const { status } = notification;
          const statusColors: { [key: string]: string } = {
            processing: '#FFA500',
            shipped: '#0000FF',
            delivered: '#008000',
            cancelled: '#FF0000'
          };
          if (preferences?.emailOnStatusChange) {
            subject = `Your Self Cart Order #${orderId} has been ${status}`;
            html = `<p>Hi ${user.displayName},</p><p>The status of your order #${orderId} has been updated to <strong style="color: ${statusColors[status] || '#000'};">${status}</strong>.</p>`;
          }
          if (preferences?.pushOnStatusChange) {
            pushTitle = 'Order Status Updated';
            pushBody = `Your order #${orderId} is now ${status}.`;
          }
          break;

        case 'low_stock_alert':
          const { productName, currentStock } = notification;
          if (preferences?.emailOnLowStock) {
            subject = `Low Stock Alert: ${productName}`;
            html = `<p>Hi Admin,</p><p>The product <strong>${productName}</strong> is running low on stock. Current stock: ${currentStock}.</p>`;
          }
          if (preferences?.pushOnLowStock) {
            pushTitle = 'Low Stock Alert';
            pushBody = `${productName} is low on stock (${currentStock} left).`;
          }
          break;

        // Add more cases for other notification types
      }

      // Send notifications
      const emailPromises: Promise<void>[] = [];
      const pushPromises: Promise<void>[] = [];

      if (email && subject && html) {
        emailPromises.push(sendEmail(email, subject, html));
      }

      if (fcmToken && pushTitle && pushBody) {
        pushPromises.push(sendPushNotification(fcmToken, pushTitle, pushBody, pushData));
      }

      await Promise.all([...emailPromises, ...pushPromises]);

    } catch (error: any) {
      console.error(`Error processing notification ${context.params.notificationId}:`, error);
    }
  });

// Send notifications to a topic
export const sendTopicNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { topic, title, body, imageUrl } = data;

  if (!topic || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Topic, title, and body are required');
  }

  const payload = {
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl })
    }
  };

  try {
    await admin.messaging().sendToTopic(topic, payload);
    return { success: true, message: `Notification sent to topic ${topic}` };
  } catch (error: any) {
    console.error(`Error sending topic notification to ${topic}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to send topic notification', error.message);
  }
});

export const notificationFunctions = {
  onNewNotification,
  sendTopicNotification
};