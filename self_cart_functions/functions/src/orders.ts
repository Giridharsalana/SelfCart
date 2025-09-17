import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Trigger on new order creation
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    const userId = order.userId;

    try {
      // Update user's order history
      await db.collection('users').doc(userId).update({
        lastOrderId: orderId,
        lastOrderAt: order.createdAt,
        totalOrders: admin.firestore.FieldValue.increment(1),
        totalSpent: admin.firestore.FieldValue.increment(order.totalAmount)
      });

      // Update product stock
      const batch = db.batch();
      for (const item of order.items) {
        const productRef = db.collection('products').doc(item.productId);
        batch.update(productRef, {
          stock: admin.firestore.FieldValue.increment(-item.quantity),
          totalSales: admin.firestore.FieldValue.increment(item.quantity)
        });
      }
      await batch.commit();

      // Create notification for order confirmation
      await db.collection('notifications').add({
        type: 'order_confirmation',
        userId,
        orderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      console.log(`Order ${orderId} processed successfully`);
    } catch (error: any) {
      console.error(`Error processing order ${orderId}:`, error);
    }
  });

// Trigger on order status update
export const onOrderStatusUpdated = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    const userId = after.userId;

    if (before.orderStatus !== after.orderStatus) {
      try {
        // Create notification for status update
        await db.collection('notifications').add({
          type: 'order_status_update',
          userId,
          orderId,
          status: after.orderStatus,
          previousStatus: before.orderStatus,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });

        console.log(`Order ${orderId} status updated to ${after.orderStatus}`);
      } catch (error: any) {
        console.error(`Error handling status update for order ${orderId}:`, error);
      }
    }
  });

export const orderFunctions = {
  onOrderCreated,
  onOrderStatusUpdated
};