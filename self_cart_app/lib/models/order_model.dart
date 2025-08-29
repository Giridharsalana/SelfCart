import 'cart_item_model.dart';

enum OrderStatus { pending, confirmed, processing, shipped, delivered, cancelled }
enum PaymentStatus { pending, completed, failed, refunded }

class OrderModel {
  final String id;
  final String userId;
  final List<CartItemModel> items;
  final double totalAmount;
  final double discountAmount;
  final String paymentMethod;
  final PaymentStatus paymentStatus;
  final OrderStatus orderStatus;
  final DateTime createdAt;
  final ReceiptModel? receipt;

  OrderModel({
    required this.id,
    required this.userId,
    required this.items,
    required this.totalAmount,
    required this.discountAmount,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.orderStatus,
    required this.createdAt,
    this.receipt,
  });

  factory OrderModel.fromMap(Map<String, dynamic> map, String id, List<CartItemModel> items) {
    return OrderModel(
      id: id,
      userId: map['userId'] ?? '',
      items: items,
      totalAmount: (map['totalAmount'] ?? 0).toDouble(),
      discountAmount: (map['discountAmount'] ?? 0).toDouble(),
      paymentMethod: map['paymentMethod'] ?? '',
      paymentStatus: PaymentStatus.values.firstWhere(
        (status) => status.name == map['paymentStatus'],
        orElse: () => PaymentStatus.pending,
      ),
      orderStatus: OrderStatus.values.firstWhere(
        (status) => status.name == map['orderStatus'],
        orElse: () => OrderStatus.pending,
      ),
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['createdAt']),
      receipt: map['receipt'] != null ? ReceiptModel.fromMap(map['receipt']) : null,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'items': items.map((item) => item.toMap()).toList(),
      'totalAmount': totalAmount,
      'discountAmount': discountAmount,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus.name,
      'orderStatus': orderStatus.name,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'receipt': receipt?.toMap(),
    };
  }

  OrderModel copyWith({
    String? id,
    String? userId,
    List<CartItemModel>? items,
    double? totalAmount,
    double? discountAmount,
    String? paymentMethod,
    PaymentStatus? paymentStatus,
    OrderStatus? orderStatus,
    DateTime? createdAt,
    ReceiptModel? receipt,
  }) {
    return OrderModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      items: items ?? this.items,
      totalAmount: totalAmount ?? this.totalAmount,
      discountAmount: discountAmount ?? this.discountAmount,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      orderStatus: orderStatus ?? this.orderStatus,
      createdAt: createdAt ?? this.createdAt,
      receipt: receipt ?? this.receipt,
    );
  }

  double get finalAmount => totalAmount - discountAmount;
}

class ReceiptModel {
  final String receiptId;
  final String receiptUrl;
  final DateTime generatedAt;

  ReceiptModel({
    required this.receiptId,
    required this.receiptUrl,
    required this.generatedAt,
  });

  factory ReceiptModel.fromMap(Map<String, dynamic> map) {
    return ReceiptModel(
      receiptId: map['receiptId'] ?? '',
      receiptUrl: map['receiptUrl'] ?? '',
      generatedAt: DateTime.fromMillisecondsSinceEpoch(map['generatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'receiptId': receiptId,
      'receiptUrl': receiptUrl,
      'generatedAt': generatedAt.millisecondsSinceEpoch,
    };
  }
}

