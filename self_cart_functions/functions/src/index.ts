import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

// Import function modules
import { orderFunctions } from './orders';
import { paymentFunctions } from './payments';
import { inventoryFunctions } from './inventory';
import { notificationFunctions } from './notifications';
import { analyticsFunction } from './analytics';
import { userFunctions } from './users';

// Export all functions
export const orders = orderFunctions;
export const payments = paymentFunctions;
export const inventory = inventoryFunctions;
export const notifications = notificationFunctions;
export const analytics = analyticsFunction;
export const users = userFunctions;

// API Gateway function for REST endpoints
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export const api = functions.https.onRequest(app);

// Scheduled functions
export const dailyAnalytics = functions.pubsub
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
      
      const dailyStats: any = {
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
    } catch (error) {
      console.error('Daily analytics failed:', error);
    }
  });

// Cleanup function for old data
export const cleanupOldData = functions.pubsub
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
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  });