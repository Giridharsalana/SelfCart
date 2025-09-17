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
exports.cleanupOldData = exports.dailyAnalytics = exports.api = exports.users = exports.analytics = exports.notifications = exports.inventory = exports.payments = exports.orders = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// Initialize Firebase Admin
admin.initializeApp();
// Import function modules
const orders_1 = require("./orders");
const payments_1 = require("./payments");
const inventory_1 = require("./inventory");
const notifications_1 = require("./notifications");
const analytics_1 = require("./analytics");
const users_1 = require("./users");
// Export all functions
exports.orders = orders_1.orderFunctions;
exports.payments = payments_1.paymentFunctions;
exports.inventory = inventory_1.inventoryFunctions;
exports.notifications = notifications_1.notificationFunctions;
exports.analytics = analytics_1.analyticsFunction;
exports.users = users_1.userFunctions;
// API Gateway function for REST endpoints
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true }));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
exports.api = functions.https.onRequest(app);
// Scheduled functions
exports.dailyAnalytics = functions.pubsub
    .schedule('0 0 * * *') // Run daily at midnight
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    console.log('Running daily analytics job');
    try {
        const db = admin.firestore();
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        // Calculate daily metrics
        const ordersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', yesterday)
            .where('createdAt', '<', today)
            .get();
        const dailyStats = {
            date: yesterday.toISOString().split('T')[0],
            totalOrders: ordersSnapshot.size,
            totalRevenue: 0,
            averageOrderValue: 0,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        let totalRevenue = 0;
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalRevenue += order.totalAmount || 0;
        });
        dailyStats.totalRevenue = totalRevenue;
        dailyStats.averageOrderValue = ordersSnapshot.size > 0 ? totalRevenue / ordersSnapshot.size : 0;
        // Save daily stats
        await db.collection('analytics').doc(`daily_${dailyStats.date}`).set(dailyStats);
        console.log('Daily analytics completed:', dailyStats);
    }
    catch (error) {
        console.error('Daily analytics failed:', error);
    }
});
// Cleanup function for old data
exports.cleanupOldData = functions.pubsub
    .schedule('0 2 * * 0') // Run weekly on Sunday at 2 AM
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    console.log('Running cleanup job');
    try {
        const db = admin.firestore();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep data for 90 days
        // Cleanup old analytics data
        const oldAnalytics = await db.collection('analytics')
            .where('generatedAt', '<', cutoffDate)
            .get();
        const batch = db.batch();
        oldAnalytics.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${oldAnalytics.size} old analytics records`);
    }
    catch (error) {
        console.error('Cleanup job failed:', error);
    }
});
//# sourceMappingURL=index.js.map