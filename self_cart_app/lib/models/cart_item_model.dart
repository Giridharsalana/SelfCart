import 'product_model.dart';

class CartItemModel {
  final String productId;
  final ProductModel product;
  final int quantity;
  final double price;
  final DateTime addedAt;

  CartItemModel({
    required this.productId,
    required this.product,
    required this.quantity,
    required this.price,
    required this.addedAt,
  });

  factory CartItemModel.fromMap(Map<String, dynamic> map, ProductModel product) {
    return CartItemModel(
      productId: map['productId'] ?? '',
      product: product,
      quantity: map['quantity'] ?? 1,
      price: (map['price'] ?? 0).toDouble(),
      addedAt: DateTime.fromMillisecondsSinceEpoch(map['addedAt']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'quantity': quantity,
      'price': price,
      'addedAt': addedAt.millisecondsSinceEpoch,
    };
  }

  CartItemModel copyWith({
    String? productId,
    ProductModel? product,
    int? quantity,
    double? price,
    DateTime? addedAt,
  }) {
    return CartItemModel(
      productId: productId ?? this.productId,
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      price: price ?? this.price,
      addedAt: addedAt ?? this.addedAt,
    );
  }

  double get totalPrice => price * quantity;
}

