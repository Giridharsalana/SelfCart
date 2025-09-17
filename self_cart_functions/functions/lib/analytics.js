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
exports.analyticsFunction = exports.getDashboardData = exports.generateAnalyticsReport = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// Generate comprehensive analytics report
exports.generateAnalyticsReport = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || !((_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.isAdmin)) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can generate analytics reports');
    }
    const { startDate, endDate, reportType = 'comprehensive' } = data;
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Validate date range
        if (start >= end) {
            throw new functions.https.HttpsError('invalid-argument', 'Start date must be before end date');
        }
        const report = {
            reportType,
            dateRange: { startDate, endDate },
            generatedAt: new Date().toISOString(),
            generatedBy: context.auth.uid,
            data: {}
        };
        // Generate different types of reports
        switch (reportType) {
            case 'sales':
                report.data = await generateSalesReport(start, end);
                break;
            case 'products':
                report.data = await generateProductReport(start, end);
                break;
            case 'customers':
                report.data = await generateCustomerReport(start, end);
                break;
            case 'comprehensive':
            default:
                report.data = await generateComprehensiveReport(start, end);
                break;
        }
        // Save report to Firestore
        const reportRef = await db.collection('analyticsReports').add(Object.assign(Object.assign({}, report), { createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        return Object.assign({ reportId: reportRef.id }, report);
    }
    catch (error) {
        console.error('Analytics report generation failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate analytics report');
    }
});
// Generate sales report
async function generateSalesReport(startDate, endDate) {
    const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .where('paymentStatus', '==', 'completed')
        .get();
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalItems = 0;
    let totalDiscounts = 0;
    const dailySales = {};
    const paymentMethods = {};
    const orderStatuses = {};
    ordersSnapshot.forEach(doc => {
        var _a, _b;
        const order = doc.data();
        const orderDate = order.createdAt.toDate().toISOString().split('T')[0];
        totalRevenue += order.totalAmount || 0;
        totalOrders++;
        totalItems += ((_a = order.items) === null || _a === void 0 ? void 0 : _a.length) || 0;
        totalDiscounts += order.discountAmount || 0;
        // Daily sales
        if (!dailySales[orderDate]) {
            dailySales[orderDate] = { revenue: 0, orders: 0, items: 0 };
        }
        dailySales[orderDate].revenue += order.totalAmount || 0;
        dailySales[orderDate].orders++;
        dailySales[orderDate].items += ((_b = order.items) === null || _b === void 0 ? void 0 : _b.length) || 0;
        // Payment methods
        const paymentMethod = order.paymentMethod || 'unknown';
        paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + 1;
        // Order statuses
        const status = order.orderStatus || 'unknown';
        orderStatuses[status] = (orderStatuses[status] || 0) + 1;
    });
    return {
        summary: {
            totalRevenue,
            totalOrders,
            totalItems,
            totalDiscounts,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            averageItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0
        },
        dailySales,
        paymentMethods,
        orderStatuses
    };
}
// Generate product report
async function generateProductReport(startDate, endDate) {
    const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .where('paymentStatus', '==', 'completed')
        .get();
    const productSales = {};
    const categorySales = {};
    for (const doc of ordersSnapshot.docs) {
        const order = doc.data();
        for (const item of order.items || []) {
            const productId = item.productId;
            const quantity = item.quantity || 0;
            const revenue = item.totalPrice || 0;
            // Get product details
            const productDoc = await db.collection('products').doc(productId).get();
            const product = productDoc.exists ? productDoc.data() : null;
            // Product sales
            if (!productSales[productId]) {
                productSales[productId] = {
                    name: (product === null || product === void 0 ? void 0 : product.name) || 'Unknown Product',
                    category: (product === null || product === void 0 ? void 0 : product.category) || 'Unknown',
                    totalQuantity: 0,
                    totalRevenue: 0,
                    orderCount: 0
                };
            }
            productSales[productId].totalQuantity += quantity;
            productSales[productId].totalRevenue += revenue;
            productSales[productId].orderCount++;
            // Category sales
            const category = (product === null || product === void 0 ? void 0 : product.category) || 'Unknown';
            if (!categorySales[category]) {
                categorySales[category] = {
                    totalQuantity: 0,
                    totalRevenue: 0,
                    productCount: 0,
                    products: new Set()
                };
            }
            categorySales[category].totalQuantity += quantity;
            categorySales[category].totalRevenue += revenue;
            if (categorySales[category].products) {
                categorySales[category].products.add(productId);
            }
        }
    }
    // Convert sets to counts
    Object.keys(categorySales).forEach(category => {
        if (categorySales[category].products) {
            categorySales[category].productCount = categorySales[category].products.size;
            delete categorySales[category].products;
        }
    });
    // Sort products by revenue
    const topProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20)
        .map(([productId, data]) => (Object.assign({ productId }, data)));
    return {
        topProducts,
        categorySales,
        totalProductsSold: Object.keys(productSales).length,
        totalCategoriesActive: Object.keys(categorySales).length
    };
}
// Generate customer report
async function generateCustomerReport(startDate, endDate) {
    const ordersSnapshot = await db.collection('orders')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .where('paymentStatus', '==', 'completed')
        .get();
    const customerData = {};
    const newCustomers = new Set();
    // Get all users who registered in this period
    const usersSnapshot = await db.collection('users')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .get();
    usersSnapshot.forEach(doc => {
        newCustomers.add(doc.id);
    });
    ordersSnapshot.forEach(doc => {
        var _a;
        const order = doc.data();
        const userId = order.userId;
        if (!customerData[userId]) {
            customerData[userId] = {
                totalOrders: 0,
                totalSpent: 0,
                totalItems: 0,
                isNewCustomer: newCustomers.has(userId),
                firstOrderDate: order.createdAt.toDate(),
                lastOrderDate: order.createdAt.toDate()
            };
        }
        const customer = customerData[userId];
        customer.totalOrders++;
        customer.totalSpent += order.totalAmount || 0;
        customer.totalItems += ((_a = order.items) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const orderDate = order.createdAt.toDate();
        if (orderDate < customer.firstOrderDate) {
            customer.firstOrderDate = orderDate;
        }
        if (orderDate > customer.lastOrderDate) {
            customer.lastOrderDate = orderDate;
        }
    });
    // Calculate customer segments
    const customerSegments = {
        newCustomers: 0,
        returningCustomers: 0,
        loyalCustomers: 0, // 5+ orders
        highValueCustomers: 0 // Top 20% by spending
    };
    const customerValues = Object.values(customerData).map(c => c.totalSpent).sort((a, b) => b - a);
    const highValueThreshold = customerValues[Math.floor(customerValues.length * 0.2)] || 0;
    Object.values(customerData).forEach(customer => {
        if (customer.isNewCustomer) {
            customerSegments.newCustomers++;
        }
        else {
            customerSegments.returningCustomers++;
        }
        if (customer.totalOrders >= 5) {
            customerSegments.loyalCustomers++;
        }
        if (customer.totalSpent >= highValueThreshold) {
            customerSegments.highValueCustomers++;
        }
    });
    return {
        totalCustomers: Object.keys(customerData).length,
        newCustomersCount: newCustomers.size,
        customerSegments,
        averageOrdersPerCustomer: Object.keys(customerData).length > 0
            ? Object.values(customerData).reduce((sum, c) => sum + c.totalOrders, 0) / Object.keys(customerData).length
            : 0,
        averageSpendPerCustomer: Object.keys(customerData).length > 0
            ? Object.values(customerData).reduce((sum, c) => sum + c.totalSpent, 0) / Object.keys(customerData).length
            : 0
    };
}
// Generate comprehensive report
async function generateComprehensiveReport(startDate, endDate) {
    const [salesData, productData, customerData] = await Promise.all([
        generateSalesReport(startDate, endDate),
        generateProductReport(startDate, endDate),
        generateCustomerReport(startDate, endDate)
    ]);
    // Get inventory data
    const productsSnapshot = await db.collection('products').get();
    let totalProducts = 0;
    let activeProducts = 0;
    let outOfStockProducts = 0;
    let lowStockProducts = 0;
    let totalInventoryValue = 0;
    productsSnapshot.forEach(doc => {
        const product = doc.data();
        totalProducts++;
        if (product.isActive) {
            activeProducts++;
        }
        const stock = product.stock || 0;
        const price = product.price || 0;
        totalInventoryValue += stock * price;
        if (stock === 0) {
            outOfStockProducts++;
        }
        else if (stock <= (product.lowStockThreshold || 10)) {
            lowStockProducts++;
        }
    });
    const kpis = {
        conversionRate: 0,
        customerRetentionRate: 0,
        averageOrderValue: 0,
        inventoryTurnover: 0
    };
    if (customerData && customerData.totalCustomers > 0 && salesData && salesData.summary) {
        kpis.conversionRate = (salesData.summary.totalOrders / customerData.totalCustomers) * 100;
        if (customerData.customerSegments) {
            kpis.customerRetentionRate = (customerData.customerSegments.returningCustomers / customerData.totalCustomers) * 100;
        }
        kpis.averageOrderValue = salesData.summary.averageOrderValue;
        if (totalInventoryValue > 0) {
            kpis.inventoryTurnover = salesData.summary.totalRevenue / totalInventoryValue;
        }
    }
    return {
        sales: salesData,
        products: productData,
        customers: customerData,
        inventory: {
            totalProducts,
            activeProducts,
            outOfStockProducts,
            lowStockProducts,
            totalInventoryValue,
            stockHealthScore: totalProducts > 0 ? ((totalProducts - outOfStockProducts - lowStockProducts) / totalProducts) * 100 : 0
        },
        kpis
    };
}
// Real-time analytics dashboard data
exports.getDashboardData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(thisMonth);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        // Today's metrics
        const todayOrders = await db.collection('orders')
            .where('createdAt', '>=', today)
            .where('paymentStatus', '==', 'completed')
            .get();
        // Yesterday's metrics
        const yesterdayOrders = await db.collection('orders')
            .where('createdAt', '>=', yesterday)
            .where('createdAt', '<', today)
            .where('paymentStatus', '==', 'completed')
            .get();
        // This month's metrics
        const thisMonthOrders = await db.collection('orders')
            .where('createdAt', '>=', thisMonth)
            .where('paymentStatus', '==', 'completed')
            .get();
        // Calculate metrics
        let todayRevenue = 0;
        let yesterdayRevenue = 0;
        let thisMonthRevenue = 0;
        todayOrders.forEach(doc => {
            todayRevenue += doc.data().totalAmount || 0;
        });
        yesterdayOrders.forEach(doc => {
            yesterdayRevenue += doc.data().totalAmount || 0;
        });
        thisMonthOrders.forEach(doc => {
            thisMonthRevenue += doc.data().totalAmount || 0;
        });
        // Get active users count
        const activeUsers = await db.collection('users')
            .where('isActive', '==', true)
            .get();
        // Get low stock products
        const lowStockProducts = await db.collection('products')
            .where('isActive', '==', true)
            .get();
        let lowStockCount = 0;
        lowStockProducts.forEach(doc => {
            const product = doc.data();
            const stock = product.stock || 0;
            const threshold = product.lowStockThreshold || 10;
            if (stock <= threshold) {
                lowStockCount++;
            }
        });
        return {
            today: {
                orders: todayOrders.size,
                revenue: todayRevenue,
                averageOrderValue: todayOrders.size > 0 ? todayRevenue / todayOrders.size : 0
            },
            yesterday: {
                orders: yesterdayOrders.size,
                revenue: yesterdayRevenue,
                averageOrderValue: yesterdayOrders.size > 0 ? yesterdayRevenue / yesterdayOrders.size : 0
            },
            thisMonth: {
                orders: thisMonthOrders.size,
                revenue: thisMonthRevenue,
                averageOrderValue: thisMonthOrders.size > 0 ? thisMonthRevenue / thisMonthOrders.size : 0
            },
            growth: {
                ordersGrowth: yesterdayOrders.size > 0 ? ((todayOrders.size - yesterdayOrders.size) / yesterdayOrders.size) * 100 : 0,
                revenueGrowth: yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0
            },
            activeUsers: activeUsers.size,
            lowStockAlerts: lowStockCount,
            lastUpdated: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Dashboard data fetch failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch dashboard data');
    }
});
exports.analyticsFunction = {
    generateAnalyticsReport: exports.generateAnalyticsReport,
    getDashboardData: exports.getDashboardData
};
//# sourceMappingURL=analytics.js.map