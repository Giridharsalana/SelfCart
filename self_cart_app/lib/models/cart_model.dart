import 'cart_item_model.dart';

class CartModel {
  final String userId;
  final List<CartItemModel> items;
  final double totalAmount;
  final String? discountCode;
  final double discountAmount;
  final DateTime updatedAt;

  CartModel({
    required this.userId,
    required this.items,
    required this.totalAmount,
    this.discountCode,
    required this.discountAmount,
    required this.updatedAt,
  });

  factory CartModel.fromMap(Map<String, dynamic> map, String userId, List<CartItemModel> items) {
    return CartModel(
      userId: userId,
      items: items,
      totalAmount: (map['totalAmount'] ?? 0).toDouble(),
      discountCode: map['discountCode'],
      discountAmount: (map['discountAmount'] ?? 0).toDouble(),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updatedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'items': items.map((item) => item.toMap()).toList(),
      'totalAmount': totalAmount,
      'discountCode': discountCode,
      'discountAmount': discountAmount,
      'updatedAt': updatedAt.millisecondsSinceEpoch,
    };
  }

  CartModel copyWith({
    String? userId,
    List<CartItemModel>? items,
    double? totalAmount,
    String? discountCode,
    double? discountAmount,
    DateTime? updatedAt,
  }) {
    return CartModel(
      userId: userId ?? this.userId,
      items: items ?? this.items,
      totalAmount: totalAmount ?? this.totalAmount,
      discountCode: discountCode ?? this.discountCode,
      discountAmount: discountAmount ?? this.discountAmount,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  double get subtotal => items.fold(0, (sum, item) => sum + item.totalPrice);
  double get finalAmount => subtotal - discountAmount;
  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);
  bool get isEmpty => items.isEmpty;
  bool get isNotEmpty => items.isNotEmpty;
}

