import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

const db = admin.firestore();

// Configure email transporter (use environment variables in production)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: functions.config().email?.user || 'your-email@gmail.com',
    pass: functions.config().email?.password || 'your-app-password'
  }
});

// Send email notification
async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: functions.config().email?.from || 'Self Cart <noreply@selfcart.com>',
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// Send push notification
async function sendPushNotification(token: string, title: string, body: string, data?: any) {
  try {
    const message = {
      token,
      notification: {
        title,
        body
      },
      data: data || {},
      android: {
        notification: {
          sound: 'default',
          priority: 'high' as const
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };
    
    await admin.messaging().send(message);
    console.log(`Push notification sent to ${token}: ${title}`);
  } catch (error) {
    console.error('Push notification failed:', error);
    throw error;
  }
}

// Trigger when a new notification is created
export const onNotificationCreated = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    const notificationId = context.params.notificationId;
    
    console.log(`New notification created: ${notificationId}`);
    
    try {
      // Get user preferences if notification is for a specific user
      let userPreferences = null;
      if (notification.userId) {
        const userDoc = await db.collection('users').doc(notification.userId).get();
        if (userDoc.exists) {
          userPreferences = userDoc.data()?.notificationPreferences || {};
        }
      }
      
      // Send notifications based on type and preferences
      await processNotification(notification, userPreferences);
      
      // Mark notification as processed
      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Error processing notification ${notificationId}:`, error);
      
      // Mark notification as failed
      await snap.ref.update({
        processed: false,
        processingError: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Process different types of notifications
async function processNotification(notification: any, userPreferences: any) {
  const { type, userId } = notification;
  
  switch (type) {
    case 'order_created':
      await handleOrderCreatedNotification(notification, userPreferences);
      break;
    
    case 'order_status_changed':
      await handleOrderStatusChangedNotification(notification, userPreferences);
      break;
    
    case 'payment_completed':
      await handlePaymentCompletedNotification(notification, userPreferences);
      break;
    
    case 'low_stock_alert':
      await handleLowStockAlert(notification);
      break;
    
    case 'out_of_stock':
      await handleOutOfStockAlert(notification);
      break;
    
    case 'welcome':
      await handleWelcomeNotification(notification, userPreferences);
      break;
    
    default:
      console.log(`Unhandled notification type: ${type}`);
  }
}

// Handle order created notification
async function handleOrderCreatedNotification(notification: any, userPreferences: any) {
  const { orderId, userId, totalAmount } = notification;
  
  // Get user details
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  
  const user = userDoc.data()!;
  
  // Send email if enabled
  if (userPreferences?.emailNotifications !== false) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmation</h2>
        <p>Dear ${user.displayName || 'Customer'},</p>
        <p>Thank you for your order! Your order has been successfully placed.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Details:</h3>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
          <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <p>You will receive another email once your order is processed and ready for pickup.</p>
        <p>Thank you for choosing Self Cart!</p>
      </div>
    `;
    
    await sendEmail(user.email, 'Order Confirmation - Self Cart', emailHtml);
  }
  
  // Send push notification if enabled
  if (userPreferences?.pushNotifications !== false && user.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      'Order Placed Successfully!',
      `Your order #${orderId} for ₹${totalAmount.toFixed(2)} has been confirmed.`,
      { orderId, type: 'order_created' }
    );
  }
}

// Handle order status changed notification
async function handleOrderStatusChangedNotification(notification: any, userPreferences: any) {
  const { orderId, userId, newStatus, oldStatus } = notification;
  
  // Get user details
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  
  const user = userDoc.data()!;
  
  const statusMessages = {
    processing: 'Your order is being processed',
    shipped: 'Your order has been shipped',
    delivered: 'Your order has been delivered',
    cancelled: 'Your order has been cancelled'
  };
  
  const message = statusMessages[newStatus] || `Your order status has been updated to ${newStatus}`;
  
  // Send email if enabled
  if (userPreferences?.emailNotifications !== false) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Status Update</h2>
        <p>Dear ${user.displayName || 'Customer'},</p>
        <p>${message}.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>Current Status:</strong> ${newStatus}</p>
          <p><strong>Updated:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <p>Thank you for choosing Self Cart!</p>
      </div>
    `;
    
    await sendEmail(user.email, `Order Update - ${orderId}`, emailHtml);
  }
  
  // Send push notification if enabled
  if (userPreferences?.pushNotifications !== false && user.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      'Order Status Updated',
      `${message} - Order #${orderId}`,
      { orderId, status: newStatus, type: 'order_status_changed' }
    );
  }
}

// Handle payment completed notification
async function handlePaymentCompletedNotification(notification: any, userPreferences: any) {
  const { orderId, userId, amount, paymentMethod } = notification;
  
  // Get user details
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  
  const user = userDoc.data()!;
  
  // Send email if enabled
  if (userPreferences?.emailNotifications !== false) {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Successful</h2>
        <p>Dear ${user.displayName || 'Customer'},</p>
        <p>Your payment has been successfully processed.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3>Payment Details:</h3>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Amount Paid:</strong> ₹${amount.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
        </div>
        <p>Your order is now being processed and you'll receive updates on its status.</p>
        <p>Thank you for your business!</p>
      </div>
    `;
    
    await sendEmail(user.email, 'Payment Confirmation - Self Cart', emailHtml);
  }
  
  // Send push notification if enabled
  if (userPreferences?.pushNotifications !== false && user.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      'Payment Successful!',
      `Payment of ₹${amount.toFixed(2)} for order #${orderId} completed successfully.`,
      { orderId, amount, type: 'payment_completed' }
    );
  }
}

// Handle low stock alert (for admins)
async function handleLowStockAlert(notification: any) {
  const { productId, productName, currentStock, threshold } = notification;
  
  // Get all admin users
  const adminsSnapshot = await db.collection('users')
    .where('isAdmin', '==', true)
    .get();
  
  const emailPromises = [];
  const pushPromises = [];
  
  adminsSnapshot.forEach(doc => {
    const admin = doc.data();
    
    // Send email to admin
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Low Stock Alert</h2>
        <p>Dear Admin,</p>
        <p>The following product is running low on stock:</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3>${productName}</h3>
          <p><strong>Product ID:</strong> ${productId}</p>
          <p><strong>Current Stock:</strong> ${currentStock}</p>
          <p><strong>Low Stock Threshold:</strong> ${threshold}</p>
        </div>
        <p>Please consider restocking this product to avoid stockouts.</p>
      </div>
    `;
    
    emailPromises.push(sendEmail(admin.email, `Low Stock Alert - ${productName}`, emailHtml));
    
    // Send push notification to admin
    if (admin.fcmToken) {
      pushPromises.push(sendPushNotification(
        admin.fcmToken,
        'Low Stock Alert',
        `${productName} is running low (${currentStock} left)`,
        { productId, type: 'low_stock_alert' }
      ));
    }
  });
  
  await Promise.allSettled([...emailPromises, ...pushPromises]);
}

// Handle out of stock alert (for admins)
async function handleOutOfStockAlert(notification: any) {
  const { productId, productName } = notification;
  
  // Get all admin users
  const adminsSnapshot = await db.collection('users')
    .where('isAdmin', '==', true)
    .get();
  
  const emailPromises = [];
  const pushPromises = [];
  
  adminsSnapshot.forEach(doc => {
    const admin = doc.data();
    
    // Send email to admin
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Out of Stock Alert</h2>
        <p>Dear Admin,</p>
        <p>The following product is now out of stock:</p>
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3>${productName}</h3>
          <p><strong>Product ID:</strong> ${productId}</p>
          <p><strong>Status:</strong> Out of Stock</p>
        </div>
        <p>Please restock this product immediately to resume sales.</p>
      </div>
    `;
    
    emailPromises.push(sendEmail(admin.email, `Out of Stock - ${productName}`, emailHtml));
    
    // Send push notification to admin
    if (admin.fcmToken) {
      pushPromises.push(sendPushNotification(
        admin.fcmToken,
        'Product Out of Stock',
        `${productName} is now out of stock`,
        { productId, type: 'out_of_stock' }
      ));
    }
  });
  
  await Promise.allSettled([...emailPromises, ...pushPromises]);
}

// Handle welcome notification for new users
async function handleWelcomeNotification(notification: any, userPreferences: any) {
  const { userId } = notification;
  
  // Get user details
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) return;
  
  const user = userDoc.data()!;
  
  // Send welcome email
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Self Cart!</h2>
      <p>Dear ${user.displayName || 'Customer'},</p>
      <p>Welcome to Self Cart - your convenient self-service shopping experience!</p>
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Getting Started:</h3>
        <ul>
          <li>Scan product barcodes with your phone camera</li>
          <li>Add items to your virtual cart</li>
          <li>Apply discount codes for savings</li>
          <li>Pay securely with multiple payment options</li>
          <li>Get instant digital receipts</li>
        </ul>
      </div>
      <p>Use code <strong>WELCOME10</strong> for 10% off your first order!</p>
      <p>Happy shopping!</p>
    </div>
  `;
  
  await sendEmail(user.email, 'Welcome to Self Cart!', emailHtml);
  
  // Send welcome push notification
  if (user.fcmToken) {
    await sendPushNotification(
      user.fcmToken,
      'Welcome to Self Cart!',
      'Start scanning and shopping with ease. Use code WELCOME10 for 10% off!',
      { type: 'welcome' }
    );
  }
}

// Send custom notification
export const sendCustomNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Check if user is admin
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists || !userDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can send custom notifications');
  }
  
  const { title, message, userIds, sendEmail: shouldSendEmail, sendPush } = data;
  
  try {
    const results = [];
    
    for (const userId of userIds) {
      const targetUserDoc = await db.collection('users').doc(userId).get();
      if (!targetUserDoc.exists) {
        results.push({ userId, success: false, error: 'User not found' });
        continue;
      }
      
      const targetUser = targetUserDoc.data()!;
      
      try {
        // Create notification record
        await db.collection('notifications').add({
          type: 'custom',
          userId,
          title,
          message,
          sentBy: context.auth.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
        
        // Send email if requested
        if (shouldSendEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">${title}</h2>
              <p>Dear ${targetUser.displayName || 'Customer'},</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <p>Thank you,<br>Self Cart Team</p>
            </div>
          `;
          
          await sendEmail(targetUser.email, title, emailHtml);
        }
        
        // Send push notification if requested
        if (sendPush && targetUser.fcmToken) {
          await sendPushNotification(
            targetUser.fcmToken,
            title,
            message,
            { type: 'custom' }
          );
        }
        
        results.push({ userId, success: true });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }
    
    return {
      success: true,
      totalSent: userIds.length,
      successfulSends: results.filter(r => r.success).length,
      failedSends: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Custom notification sending failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notifications');
  }
});

export const notificationFunctions = {
  onNotificationCreated,
  sendCustomNotification
};

