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
exports.inventoryFunctions = exports.autoReorderProducts = exports.generateInventoryReport = exports.bulkUpdateInventory = exports.onStockUpdated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Trigger when product stock is updated
exports.onStockUpdated = functions.firestore
    .document('products/{productId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const productId = context.params.productId;
    // Check if stock changed
    if (before.stock !== after.stock) {
        console.log(`Stock updated for product ${productId}: ${before.stock} -> ${after.stock}`);
        try {
            // Create stock movement record
            await db.collection('stockMovements').add({
                productId,
                productName: after.name,
                previousStock: before.stock,
                newStock: after.stock,
                change: after.stock - before.stock,
                reason: after.stockUpdateReason || 'manual_update',
                updatedBy: after.updatedBy || 'system',
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Check for low stock alert
            const lowStockThreshold = after.lowStockThreshold || 10;
            if (after.stock <= lowStockThreshold && before.stock > lowStockThreshold) {
                await db.collection('notifications').add({
                    type: 'low_stock_alert',
                    productId,
                    productName: after.name,
                    currentStock: after.stock,
                    threshold: lowStockThreshold,
                    severity: after.stock === 0 ? 'critical' : 'warning',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                console.log(`Low stock alert created for product ${productId}`);
            }
            // Check for out of stock
            if (after.stock === 0 && before.stock > 0) {
                await db.collection('products').doc(productId).update({
                    isOutOfStock: true,
                    outOfStockSince: admin.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('notifications').add({
                    type: 'out_of_stock',
                    productId,
                    productName: after.name,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                console.log(`Product ${productId} marked as out of stock`);
            }
            // Check if back in stock
            if (after.stock > 0 && before.stock === 0) {
                await db.collection('products').doc(productId).update({
                    isOutOfStock: false,
                    backInStockAt: admin.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('notifications').add({
                    type: 'back_in_stock',
                    productId,
                    productName: after.name,
                    newStock: after.stock,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                console.log(`Product ${productId} is back in stock`);
            }
        }
        catch (error) {
            console.error(`Error handling stock update for product ${productId}:`, error);
        }
    }
});
// Bulk update inventory
exports.bulkUpdateInventory = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can bulk update inventory');
    }
    const { updates, reason = 'bulk_update' } = data;
    if (!Array.isArray(updates) || updates.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Updates array is required');
    }
    try {
        const batch = db.batch();
        const results = [];
        for (const update of updates) {
            const { productId, stock, operation = 'set' } = update;
            if (!productId || typeof stock !== 'number') {
                results.push({
                    productId,
                    success: false,
                    error: 'Invalid productId or stock value'
                });
                continue;
            }
            const productRef = db.collection('products').doc(productId);
            const productDoc = await productRef.get();
            if (!productDoc.exists) {
                results.push({
                    productId,
                    success: false,
                    error: 'Product not found'
                });
                continue;
            }
            const product = productDoc.data();
            let newStock;
            switch (operation) {
                case 'set':
                    newStock = Math.max(0, stock);
                    break;
                case 'add':
                    newStock = Math.max(0, (product.stock || 0) + stock);
                    break;
                case 'subtract':
                    newStock = Math.max(0, (product.stock || 0) - stock);
                    break;
                default:
                    results.push({
                        productId,
                        success: false,
                        error: 'Invalid operation. Use set, add, or subtract'
                    });
                    continue;
            }
            batch.update(productRef, {
                stock: newStock,
                stockUpdateReason: reason,
                updatedBy: context.auth.uid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            results.push({
                productId,
                success: true,
                previousStock: product.stock || 0,
                newStock,
                operation
            });
        }
        await batch.commit();
        // Create bulk update log
        await db.collection('bulkOperations').add({
            type: 'inventory_update',
            performedBy: context.auth.uid,
            reason,
            totalUpdates: updates.length,
            successfulUpdates: results.filter(r => r.success).length,
            failedUpdates: results.filter(r => !r.success).length,
            results,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            totalUpdates: updates.length,
            successfulUpdates: results.filter(r => r.success).length,
            failedUpdates: results.filter(r => !r.success).length,
            results
        };
    }
    catch (error) {
        console.error('Bulk inventory update failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update inventory');
    }
});
// Generate inventory report
exports.generateInventoryReport = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can generate inventory reports');
    }
    const { includeOutOfStock = true, includeInactive = false, category } = data;
    try {
        let query = db.collection('products');
        if (!includeInactive) {
            query = query.where('isActive', '==', true);
        }
        if (category) {
            query = query.where('category', '==', category);
        }
        const productsSnapshot = await query.get();
        const products = [];
        let totalProducts = 0;
        let totalValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        const categoryStats = {};
        productsSnapshot.forEach(doc => {
            const product = doc.data();
            const productData = {
                id: doc.id,
                name: product.name,
                category: product.category,
                stock: product.stock || 0,
                price: product.price || 0,
                value: (product.stock || 0) * (product.price || 0),
                isActive: product.isActive,
                lowStockThreshold: product.lowStockThreshold || 10,
                isLowStock: (product.stock || 0) <= (product.lowStockThreshold || 10),
                isOutOfStock: (product.stock || 0) === 0
            };
            if (includeOutOfStock || !productData.isOutOfStock) {
                products.push(productData);
            }
            totalProducts++;
            totalValue += productData.value;
            if (productData.isLowStock)
                lowStockCount++;
            if (productData.isOutOfStock)
                outOfStockCount++;
            // Category statistics
            if (!categoryStats[product.category]) {
                categoryStats[product.category] = {
                    count: 0,
                    totalStock: 0,
                    totalValue: 0,
                    lowStockCount: 0,
                    outOfStockCount: 0
                };
            }
            const catStats = categoryStats[product.category];
            catStats.count++;
            catStats.totalStock += product.stock || 0;
            catStats.totalValue += productData.value;
            if (productData.isLowStock)
                catStats.lowStockCount++;
            if (productData.isOutOfStock)
                catStats.outOfStockCount++;
        });
        const report = {
            generatedAt: new Date().toISOString(),
            generatedBy: context.auth.uid,
            summary: {
                totalProducts,
                totalValue,
                lowStockCount,
                outOfStockCount,
                lowStockPercentage: totalProducts > 0 ? (lowStockCount / totalProducts) * 100 : 0,
                outOfStockPercentage: totalProducts > 0 ? (outOfStockCount / totalProducts) * 100 : 0
            },
            categoryStats,
            products: products.sort((a, b) => a.name.localeCompare(b.name))
        };
        // Save report to Firestore
        const reportRef = await db.collection('reports').add(Object.assign(Object.assign({ type: 'inventory' }, report), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        return Object.assign({ reportId: reportRef.id }, report);
    }
    catch (error) {
        console.error('Inventory report generation failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate inventory report');
    }
});
// Auto-reorder products
exports.autoReorderProducts = functions.pubsub
    .schedule('0 9 * * 1') // Run every Monday at 9 AM
    .timeZone('Asia/Kolkata')
    .onRun(async (context) => {
    console.log('Running auto-reorder job');
    try {
        // Get products that need reordering
        const productsSnapshot = await db.collection('products')
            .where('autoReorder', '==', true)
            .where('isActive', '==', true)
            .get();
        const reorderList = [];
        for (const doc of productsSnapshot.docs) {
            const product = doc.data();
            const currentStock = product.stock || 0;
            const reorderLevel = product.reorderLevel || 10;
            const reorderQuantity = product.reorderQuantity || 50;
            if (currentStock <= reorderLevel) {
                reorderList.push({
                    productId: doc.id,
                    productName: product.name,
                    currentStock,
                    reorderLevel,
                    reorderQuantity,
                    supplier: product.supplier,
                    category: product.category
                });
            }
        }
        if (reorderList.length > 0) {
            // Create reorder notification
            await db.collection('notifications').add({
                type: 'auto_reorder',
                products: reorderList,
                totalProducts: reorderList.length,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                read: false
            });
            // Create purchase orders (simplified)
            for (const item of reorderList) {
                await db.collection('purchaseOrders').add({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.reorderQuantity,
                    supplier: item.supplier,
                    status: 'pending',
                    type: 'auto_reorder',
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            console.log(`Auto-reorder created for ${reorderList.length} products`);
        }
        else {
            console.log('No products need reordering');
        }
    }
    catch (error) {
        console.error('Auto-reorder job failed:', error);
    }
});
exports.inventoryFunctions = {
    onStockUpdated: exports.onStockUpdated,
    bulkUpdateInventory: exports.bulkUpdateInventory,
    generateInventoryReport: exports.generateInventoryReport,
    autoReorderProducts: exports.autoReorderProducts
};
//# sourceMappingURL=inventory.js.map