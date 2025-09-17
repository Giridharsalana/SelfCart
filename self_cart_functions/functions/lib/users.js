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
exports.userFunctions = exports.getUserRecommendations = exports.updateUserProfile = exports.onUserDeleted = exports.onUserCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Trigger on new user creation
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
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
    }
    catch (error) {
        console.error(`Error creating user document for ${uid}:`, error);
    }
});
// Trigger on user deletion
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
    const { uid } = user;
    try {
        // Delete user document from Firestore
        await db.collection('users').doc(uid).delete();
        console.log(`User document deleted for ${uid}`);
    }
    catch (error) {
        console.error(`Error deleting user document for ${uid}:`, error);
    }
});
// Update user profile
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { uid } = context.auth;
    const { displayName, photoURL, phone, address, preferences } = data;
    try {
        const userRef = db.collection('users').doc(uid);
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        if (displayName)
            updateData.displayName = displayName;
        if (photoURL)
            updateData.photoURL = photoURL;
        if (phone)
            updateData['profile.phone'] = phone;
        if (address)
            updateData['profile.address'] = address;
        if (preferences)
            updateData.preferences = preferences;
        await userRef.update(updateData);
        return { success: true, message: 'Profile updated successfully' };
    }
    catch (error) {
        console.error(`Error updating profile for user ${uid}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to update profile');
    }
});
// Get user recommendations
exports.getUserRecommendations = functions.https.onCall(async (data, context) => {
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
        const productCounts = {};
        const categoryCounts = {};
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
        const recommendations = [];
        if (topCategories.length > 0) {
            const productsSnapshot = await db.collection('products')
                .where('category', 'in', topCategories)
                .where('isActive', '==', true)
                .orderBy('totalSales', 'desc')
                .limit(10)
                .get();
            productsSnapshot.forEach(doc => {
                if (!productCounts[doc.id]) {
                    recommendations.push(Object.assign({ id: doc.id }, doc.data()));
                }
            });
        }
        return { recommendations };
    }
    catch (error) {
        console.error(`Error getting recommendations for user ${uid}:`, error);
        throw new functions.https.HttpsError('internal', 'Failed to get recommendations');
    }
});
exports.userFunctions = {
    onUserCreated: exports.onUserCreated,
    onUserDeleted: exports.onUserDeleted,
    updateUserProfile: exports.updateUserProfile,
    getUserRecommendations: exports.getUserRecommendations
};
//# sourceMappingURL=users.js.map