import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Trigger when a new order is created
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;
    
    console.log(`New order created: ${orderId}`);
    
    try {
      // Update inventory for each item
      const batch = db.batch();
      
      for (const item of order.items) {
        const productRef = db.collection('products').doc(item.productId);
        const productDoc = await productRef.get();
        
        if (productDoc.exists) {
          const product = productDoc.data()!;
          const newStock = Math.max(0, (product.stock || 0) - item.quantity);
          
          batch.update(productRef, {
            stock: newStock,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Check for low stock
          if (newStock <= (product.lowStockThreshold || 10)) {
            // Trigger low stock notification
            await db.collection('notifications').add({
              type: 'low_stock',
              productId: item.productId,
              productName: product.name,
              currentStock: newStock,
              threshold: product.lowStockThreshold || 10,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              read: false
            });
          }
        }
      }
      
      await batch.commit();
      
      // Send order confirmation notification
      await db.collection('notifications').add({
        type: 'order_created',
        orderId: orderId,
        userId: order.userId,
        totalAmount: order.totalAmount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      console.log(`Order ${orderId} processed successfully`);
    } catch (error) {
      console.error(`Error processing order ${orderId}:`, error);
      
      // Update order with error status
      await snap.ref.update({
        processingError: error.message,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });

// Trigger when order status is updated
export const onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;
    
    // Check if order status changed
    if (before.orderStatus !== after.orderStatus) {
      console.log(`Order ${orderId} status changed from ${before.orderStatus} to ${after.orderStatus}`);
      
      try {
        // Send status update notification
        await db.collection('notifications').add({
          type: 'order_status_changed',
          orderId: orderId,
          userId: after.userId,
          oldStatus: before.orderStatus,
          newStatus: after.orderStatus,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
        
        // If order is cancelled, restore inventory
        if (after.orderStatus === 'cancelled' && before.orderStatus !== 'cancelled') {
          const batch = db.batch();
          
          for (const item of after.items) {
            const productRef = db.collection('products').doc(item.productId);
            const productDoc = await productRef.get();
            
            if (productDoc.exists) {
              const product = productDoc.data()!;
              const newStock = (product.stock || 0) + item.quantity;
              
              batch.update(productRef, {
                stock: newStock,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }
          
          await batch.commit();
          console.log(`Inventory restored for cancelled order ${orderId}`);
        }
        
        // If order is delivered, update customer stats
        if (after.orderStatus === 'delivered') {
          const userRef = db.collection('users').doc(after.userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            const user = userDoc.data()!;
            await userRef.update({
              totalOrders: (user.totalOrders || 0) + 1,
              totalSpent: (user.totalSpent || 0) + after.totalAmount,
              lastOrderDate: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error(`Error handling order status change for ${orderId}:`, error);
      }
    }
  });

// Function to validate order before creation
export const validateOrder = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { items } = data;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Order must contain at least one item');
  }
  
  try {
    const validationResults = [];
    
    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      
      if (!productDoc.exists) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: 'Product not found'
        });
        continue;
      }
      
      const product = productDoc.data()!;
      
      if (!product.isActive) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: 'Product is not active'
        });
        continue;
      }
      
      if (product.stock < item.quantity) {
        validationResults.push({
          productId: item.productId,
          valid: false,
          reason: `Insufficient stock. Available: ${product.stock}, Requested: ${item.quantity}`
        });
        continue;
      }
      
      validationResults.push({
        productId: item.productId,
        valid: true,
        availableStock: product.stock,
        currentPrice: product.price
      });
    }
    
    const invalidItems = validationResults.filter(result => !result.valid);
    
    return {
      valid: invalidItems.length === 0,
      items: validationResults,
      invalidItems: invalidItems
    };
  } catch (error) {
    console.error('Order validation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to validate order');
  }
});

// Function to calculate order total
export const calculateOrderTotal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { items, discountCode } = data;
  
  try {
    let subtotal = 0;
    const itemDetails = [];
    
    // Calculate subtotal
    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      
      if (!productDoc.exists) {
        throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
      }
      
      const product = productDoc.data()!;
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      itemDetails.push({
        productId: item.productId,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal
      });
    }
    
    let discountAmount = 0;
    let discountDetails = null;
    
    // Apply discount if provided
    if (discountCode) {
      const discountQuery = await db.collection('discountCodes')
        .where('code', '==', discountCode.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (!discountQuery.empty) {
        const discountDoc = discountQuery.docs[0];
        const discount = discountDoc.data();
        
        // Check if discount is valid
        const now = new Date();
        const validFrom = discount.validFrom.toDate();
        const validUntil = discount.validUntil.toDate();
        
        if (now >= validFrom && now <= validUntil && discount.currentUses < discount.maxUses) {
          if (subtotal >= discount.minOrderAmount) {
            if (discount.discountType === 'percentage') {
              discountAmount = Math.min(subtotal * (discount.discountValue / 100), subtotal);
            } else {
              discountAmount = Math.min(discount.discountValue, subtotal);
            }
            
            discountDetails = {
              code: discount.code,
              type: discount.discountType,
              value: discount.discountValue,
              amount: discountAmount
            };
          }
        }
      }
    }
    
    const total = subtotal - discountAmount;
    
    return {
      subtotal,
      discountAmount,
      total,
      items: itemDetails,
      discount: discountDetails
    };
  } catch (error) {
    console.error('Order calculation error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to calculate order total');
  }
});

export const orderFunctions = {
  onOrderCreated,
  onOrderStatusChanged,
  validateOrder,
  calculateOrderTotal
};

