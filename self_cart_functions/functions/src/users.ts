import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Trigger on new user creation
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, photoURL } = user;

  try {
    // Create user document in Firestore
    await db.collection('users').doc(uid).set({
      uid,
      email,
      displayName,
      photoURL,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      roles: { customer: true }, // Default role
      preferences: {
        emailOnOrder: true,
        emailOnStatusChange: true,
        pushOnOrder: true,
        pushOnStatusChange: true
      }
    });

    console.log(`User document created for ${uid}`);
  } catch (error) {
    console.error(`Error creating user document for ${uid}:`, error);
  }
});

// Trigger on user deletion
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;

  try {
    // Delete user document from Firestore
    await db.collection('users').doc(uid).delete();
    console.log(`User document deleted for ${uid}`);
  } catch (error) {
    console.error(`Error deleting user document for ${uid}:`, error);
  }
});

// Update user profile
export const updateUserProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid } = context.auth;
  const { displayName, photoURL, phone, address, preferences } = data;

  try {
    const userRef = db.collection('users').doc(uid);
    const updateData: { [key: string]: any } = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (phone) updateData['profile.phone'] = phone;
    if (address) updateData['profile.address'] = address;
    if (preferences) updateData.preferences = preferences;

    await userRef.update(updateData);

    return { success: true, message: 'Profile updated successfully' };
  } catch (error) {
    console.error(`Error updating profile for user ${uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to update profile');
  }
});

// Get user recommendations
export const getUserRecommendations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { uid } = context.auth;

  try {
    // Get user's past orders
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (ordersSnapshot.empty) {
      return { recommendations: [] }; // No past orders, return empty
    }

    const productCounts: { [key: string]: number } = {};
    const categoryCounts: { [key: string]: number } = {};

    // Analyze past purchases
    for (const doc of ordersSnapshot.docs) {
      const order = doc.data();
      for (const item of order.items) {
        productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
        // Assuming product data is denormalized in order item
        if (item.category) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
      }
    }

    // Get top 3 categories
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Get popular products from top categories (excluding already purchased)
    const recommendations: any[] = [];
    if (topCategories.length > 0) {
      const productsSnapshot = await db.collection('products')
        .where('category', 'in', topCategories)
        .where('isActive', '==', true)
        .orderBy('totalSales', 'desc')
        .limit(10)
        .get();

      productsSnapshot.forEach(doc => {
        if (!productCounts[doc.id]) {
          recommendations.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    return { recommendations };
  } catch (error) {
    console.error(`Error getting recommendations for user ${uid}:`, error);
    throw new functions.https.HttpsError('internal', 'Failed to get recommendations');
  }
});

export const userFunctions = {
  onUserCreated,
  onUserDeleted,
  updateUserProfile,
  getUserRecommendations
};