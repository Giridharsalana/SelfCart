import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/order_model.dart';
import '../models/cart_model.dart';
import '../models/cart_item_model.dart';
import '../services/product_service.dart';
import '../utils/constants.dart';

class OrderService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ProductService _productService = ProductService();

  // Create order from cart
  Future<String> createOrder({
    required String userId,
    required CartModel cart,
    required String paymentMethod,
  }) async {
    try {
      final orderData = {
        'userId': userId,
        'items': cart.items.map((item) => item.toMap()).toList(),
        'totalAmount': cart.finalAmount,
        'discountAmount': cart.discountAmount,
        'paymentMethod': paymentMethod,
        'paymentStatus': PaymentStatus.pending.name,
        'orderStatus': OrderStatus.pending.name,
        'createdAt': FieldValue.serverTimestamp(),
      };

      final docRef = await _firestore
          .collection(AppConstants.ordersCollection)
          .add(orderData);

      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create order: $e');
    }
  }

  // Update order payment status
  Future<void> updateOrderPaymentStatus({
    required String orderId,
    required PaymentStatus paymentStatus,
    String? transactionId,
    Map<String, dynamic>? paymentDetails,
  }) async {
    try {
      final updateData = {
        'paymentStatus': paymentStatus.name,
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (transactionId != null) {
        updateData['transactionId'] = transactionId;
      }

      if (paymentDetails != null) {
        updateData['paymentDetails'] = paymentDetails;
      }

      // If payment is completed, update order status
      if (paymentStatus == PaymentStatus.completed) {
        updateData['orderStatus'] = OrderStatus.confirmed.name;
      }

      await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .update(updateData);
    } catch (e) {
      throw Exception('Failed to update order payment status: $e');
    }
  }

  // Update order status
  Future<void> updateOrderStatus({
    required String orderId,
    required OrderStatus orderStatus,
  }) async {
    try {
      await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .update({
        'orderStatus': orderStatus.name,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to update order status: $e');
    }
  }

  // Get user orders
  Stream<List<OrderModel>> getUserOrders(String userId) {
    return _firestore
        .collection(AppConstants.ordersCollection)
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .asyncMap((snapshot) async {
      final orders = <OrderModel>[];
      
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final itemsData = List<Map<String, dynamic>>.from(data['items'] ?? []);
        
        // Fetch product details for each order item
        final items = <CartItemModel>[];
        for (final itemData in itemsData) {
          final product = await _productService.getProductById(itemData['productId']);
          if (product != null) {
            items.add(CartItemModel.fromMap(itemData, product));
          }
        }

        orders.add(OrderModel.fromMap(data, doc.id, items));
      }
      
      return orders;
    });
  }

  // Get order by ID
  Future<OrderModel?> getOrderById(String orderId) async {
    try {
      final doc = await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .get();

      if (!doc.exists || doc.data() == null) {
        return null;
      }

      final data = doc.data()!;
      final itemsData = List<Map<String, dynamic>>.from(data['items'] ?? []);
      
      // Fetch product details for each order item
      final items = <CartItemModel>[];
      for (final itemData in itemsData) {
        final product = await _productService.getProductById(itemData['productId']);
        if (product != null) {
          items.add(CartItemModel.fromMap(itemData, product));
        }
      }

      return OrderModel.fromMap(data, doc.id, items);
    } catch (e) {
      throw Exception('Failed to get order: $e');
    }
  }

  // Cancel order
  Future<void> cancelOrder(String orderId) async {
    try {
      await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .update({
        'orderStatus': OrderStatus.cancelled.name,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to cancel order: $e');
    }
  }

  // Add receipt to order
  Future<void> addReceiptToOrder({
    required String orderId,
    required String receiptId,
    required String receiptUrl,
  }) async {
    try {
      await _firestore
          .collection(AppConstants.ordersCollection)
          .doc(orderId)
          .update({
        'receipt': {
          'receiptId': receiptId,
          'receiptUrl': receiptUrl,
          'generatedAt': FieldValue.serverTimestamp(),
        },
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to add receipt to order: $e');
    }
  }

  // Get orders by status (Admin)
  Stream<List<OrderModel>> getOrdersByStatus(OrderStatus status) {
    return _firestore
        .collection(AppConstants.ordersCollection)
        .where('orderStatus', isEqualTo: status.name)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .asyncMap((snapshot) async {
      final orders = <OrderModel>[];
      
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final itemsData = List<Map<String, dynamic>>.from(data['items'] ?? []);
        
        // Fetch product details for each order item
        final items = <CartItemModel>[];
        for (final itemData in itemsData) {
          final product = await _productService.getProductById(itemData['productId']);
          if (product != null) {
            items.add(CartItemModel.fromMap(itemData, product));
          }
        }

        orders.add(OrderModel.fromMap(data, doc.id, items));
      }
      
      return orders;
    });
  }

  // Get all orders (Admin)
  Stream<List<OrderModel>> getAllOrders({int? limit}) {
    Query query = _firestore
        .collection(AppConstants.ordersCollection)
        .orderBy('createdAt', descending: true);
    
    if (limit != null) {
      query = query.limit(limit);
    }

    return query.snapshots().asyncMap((snapshot) async {
      final orders = <OrderModel>[];
      
      for (final doc in snapshot.docs) {
        final data = doc.data() as Map<String, dynamic>;
        final itemsData = List<Map<String, dynamic>>.from(data['items'] ?? []);
        
        // Fetch product details for each order item
        final items = <CartItemModel>[];
        for (final itemData in itemsData) {
          final product = await _productService.getProductById(itemData['productId']);
          if (product != null) {
            items.add(CartItemModel.fromMap(itemData, product));
          }
        }

        orders.add(OrderModel.fromMap(data, doc.id, items));
      }
      
      return orders;
    });
  }

  // Get order statistics (Admin)
  Future<OrderStatistics> getOrderStatistics() async {
    try {
      final now = DateTime.now();
      final startOfDay = DateTime(now.year, now.month, now.day);
      final startOfMonth = DateTime(now.year, now.month, 1);

      // Today's orders
      final todayQuery = await _firestore
          .collection(AppConstants.ordersCollection)
          .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .get();

      // This month's orders
      final monthQuery = await _firestore
          .collection(AppConstants.ordersCollection)
          .where('createdAt', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfMonth))
          .get();

      // All orders
      final allQuery = await _firestore
          .collection(AppConstants.ordersCollection)
          .get();

      double todayRevenue = 0;
      double monthRevenue = 0;
      double totalRevenue = 0;

      for (final doc in todayQuery.docs) {
        final data = doc.data();
        todayRevenue += (data['totalAmount'] ?? 0).toDouble();
      }

      for (final doc in monthQuery.docs) {
        final data = doc.data();
        monthRevenue += (data['totalAmount'] ?? 0).toDouble();
      }

      for (final doc in allQuery.docs) {
        final data = doc.data();
        totalRevenue += (data['totalAmount'] ?? 0).toDouble();
      }

      return OrderStatistics(
        todayOrders: todayQuery.docs.length,
        monthOrders: monthQuery.docs.length,
        totalOrders: allQuery.docs.length,
        todayRevenue: todayRevenue,
        monthRevenue: monthRevenue,
        totalRevenue: totalRevenue,
      );
    } catch (e) {
      throw Exception('Failed to get order statistics: $e');
    }
  }
}

class OrderStatistics {
  final int todayOrders;
  final int monthOrders;
  final int totalOrders;
  final double todayRevenue;
  final double monthRevenue;
  final double totalRevenue;

  OrderStatistics({
    required this.todayOrders,
    required this.monthOrders,
    required this.totalOrders,
    required this.todayRevenue,
    required this.monthRevenue,
    required this.totalRevenue,
  });
}

