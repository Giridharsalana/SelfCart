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
exports.orderFunctions = exports.onOrderStatusUpdated = exports.onOrderCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Trigger on new order creation
exports.onOrderCreated = functions.firestore
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
    }
    catch (error) {
        console.error(`Error processing order ${orderId}:`, error);
    }
});
// Trigger on order status update
exports.onOrderStatusUpdated = functions.firestore
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
        }
        catch (error) {
            console.error(`Error handling status update for order ${orderId}:`, error);
        }
    }
});
exports.orderFunctions = {
    onOrderCreated: exports.onOrderCreated,
    onOrderStatusUpdated: exports.onOrderStatusUpdated
};
//# sourceMappingURL=orders.js.map