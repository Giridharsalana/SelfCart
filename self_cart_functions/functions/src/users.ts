import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Trigger when a new user is created
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  console.log(`New user created: ${user.uid}`);
  
  try {
    // Create user document in Firestore
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      phone: user.phoneNumber || null,
      isActive: true,
      isAdmin: false,
      emailVerified: user.emailVerified,
      totalOrders: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      notificationPreferences: {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        orderUpdates: true,
        promotions: true,
        lowStockAlerts: false // Only for admins
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Send welcome notification
    await db.collection('notifications').add({
      type: 'welcome',
      userId: user.uid,
      title: 'Welcome to Self Cart!',
      message: 'Thank you for joining Self Cart. Start scanning and shopping with ease!',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    console.log(`User document created for ${user.uid}`);
  } catch (error) {
    console.error(`Error creating user document for ${user.uid}:`, error);
  }
});

// Trigger when a user is deleted
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  console.log(`User deleted: ${user.uid}`);
  
  try {
    // Mark user as deleted instead of actually deleting (for data integrity)
    await db.collection('users').doc(user.uid).update({
      isActive: false,
      isDeleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Optionally, you might want to anonymize user data
    // or handle cleanup of user-related data here
    
    console.log(`User ${user.uid} marked as deleted`);
  } catch (error) {
    console.error(`Error handling user deletion for ${user.uid}:`, error);
  }
});

// Update user profile
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { displayName, phone, notificationPreferences } = data;
  const userId = context.auth.uid;
  
  try {
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    
    if (phone !== undefined) {
      updateData.phone = phone;
    }
    
    if (notificationPreferences !== undefined) {
      updateData.notificationPreferences = notificationPreferences;
    }
    
    await db.collection('users').doc(userId).update(updateData);
    
    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error('Profile update failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update profile');
  }
});

// Get user profile with additional data
export const getUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }
    
    const userData = userDoc.data()!;
    
    // Get user's order statistics
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .where('paymentStatus', '==', 'completed')
      .get();
    
    let totalSpent = 0;
    let totalOrders = ordersSnapshot.size;
    const ordersByMonth = {};
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      totalSpent += order.totalAmount || 0;
      
      const orderDate = order.createdAt.toDate();
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!ordersByMonth[monthKey]) {
        ordersByMonth[monthKey] = { orders: 0, spent: 0 };
      }
      ordersByMonth[monthKey].orders++;
      ordersByMonth[monthKey].spent += order.totalAmount || 0;
    });
    
    // Get user's favorite products (most ordered)
    const productCounts = {};
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      order.items?.forEach(item => {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
      });
    });
    
    const favoriteProducts = Object.entries(productCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([productId, quantity]) => ({ productId, quantity }));
    
    // Get favorite products details
    const favoriteProductsDetails = [];
    for (const fav of favoriteProducts) {
      const productDoc = await db.collection('products').doc(fav.productId).get();
      if (productDoc.exists) {
        favoriteProductsDetails.push({
          ...productDoc.data(),
          id: fav.productId,
          orderCount: fav.quantity
        });
      }
    }
    
    return {
      profile: userData,
      statistics: {
        totalOrders,
        totalSpent,
        averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
        ordersByMonth,
        favoriteProducts: favoriteProductsDetails
      }
    };
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get user profile');
  }
});

// Update FCM token for push notifications
export const updateFCMToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { fcmToken } = data;
  const userId = context.auth.uid;
  
  if (!fcmToken) {
    throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
  }
  
  try {
    await db.collection('users').doc(userId).update({
      fcmToken,
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, message: 'FCM token updated successfully' };
  } catch (error) {
    console.error('FCM token update failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update FCM token');
  }
});

// Get user's order history
export const getUserOrderHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { limit = 20, startAfter } = data;
  const userId = context.auth.uid;
  
  try {
    let query = db.collection('orders')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (startAfter) {
      const startAfterDoc = await db.collection('orders').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    const ordersSnapshot = await query.get();
    const orders = [];
    
    for (const doc of ordersSnapshot.docs) {
      const orderData = doc.data();
      
      // Get product details for each order item
      const itemsWithDetails = [];
      for (const item of orderData.items || []) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (productDoc.exists) {
          itemsWithDetails.push({
            ...item,
            product: productDoc.data()
          });
        }
      }
      
      orders.push({
        id: doc.id,
        ...orderData,
        items: itemsWithDetails,
        createdAt: orderData.createdAt.toDate().toISOString()
      });
    }
    
    return {
      orders,
      hasMore: ordersSnapshot.size === limit,
      lastOrderId: ordersSnapshot.size > 0 ? ordersSnapshot.docs[ordersSnapshot.size - 1].id : null
    };
  } catch (error) {
    console.error('Get user order history failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get order history');
  }
});

// Award loyalty points
export const awardLoyaltyPoints = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Check if user is admin
  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || !adminDoc.data()?.isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can award loyalty points');
  }
  
  const { userId, points, reason } = data;
  
  if (!userId || typeof points !== 'number' || points <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid userId and positive points are required');
  }
  
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const currentPoints = userDoc.data()?.loyaltyPoints || 0;
    
    await userRef.update({
      loyaltyPoints: currentPoints + points,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create loyalty points transaction record
    await db.collection('loyaltyTransactions').add({
      userId,
      points,
      type: 'earned',
      reason: reason || 'Manual award by admin',
      awardedBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Send notification to user
    await db.collection('notifications').add({
      type: 'loyalty_points_awarded',
      userId,
      title: 'Loyalty Points Earned!',
      message: `You've earned ${points} loyalty points! ${reason || ''}`,
      points,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    return {
      success: true,
      message: `${points} loyalty points awarded successfully`,
      newBalance: currentPoints + points
    };
  } catch (error) {
    console.error('Award loyalty points failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to award loyalty points');
  }
});

// Get loyalty points history
export const getLoyaltyPointsHistory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    const transactionsSnapshot = await db.collection('loyaltyTransactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate().toISOString()
    }));
    
    // Get current balance
    const userDoc = await db.collection('users').doc(userId).get();
    const currentBalance = userDoc.exists ? userDoc.data()?.loyaltyPoints || 0 : 0;
    
    return {
      currentBalance,
      transactions
    };
  } catch (error) {
    console.error('Get loyalty points history failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get loyalty points history');
  }
});

export const userFunctions = {
  onUserCreated,
  onUserDeleted,
  updateUserProfile,
  getUserProfile,
  updateFCMToken,
  getUserOrderHistory,
  awardLoyaltyPoints,
  getLoyaltyPointsHistory
};

