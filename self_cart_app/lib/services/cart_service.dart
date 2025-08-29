import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/cart_model.dart';
import '../models/cart_item_model.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';
import '../utils/constants.dart';

class CartService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final ProductService _productService = ProductService();

  // Get user cart
  Stream<CartModel?> getUserCart(String userId) {
    return _firestore
        .collection(AppConstants.cartsCollection)
        .doc(userId)
        .snapshots()
        .asyncMap((snapshot) async {
      if (!snapshot.exists || snapshot.data() == null) {
        return null;
      }

      final data = snapshot.data()!;
      final itemsData = List<Map<String, dynamic>>.from(data['items'] ?? []);
      
      // Fetch product details for each cart item
      final items = <CartItemModel>[];
      for (final itemData in itemsData) {
        final product = await _productService.getProductById(itemData['productId']);
        if (product != null) {
          items.add(CartItemModel.fromMap(itemData, product));
        }
      }

      return CartModel.fromMap(data, userId, items);
    });
  }

  // Add item to cart
  Future<void> addToCart(String userId, ProductModel product, int quantity) async {
    try {
      final cartRef = _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId);

      await _firestore.runTransaction((transaction) async {
        final cartDoc = await transaction.get(cartRef);
        
        if (!cartDoc.exists) {
          // Create new cart
          final newCartItem = CartItemModel(
            productId: product.id,
            product: product,
            quantity: quantity,
            price: product.price,
            addedAt: DateTime.now(),
          );

          final cartData = {
            'items': [newCartItem.toMap()],
            'totalAmount': product.price * quantity,
            'discountAmount': 0.0,
            'updatedAt': FieldValue.serverTimestamp(),
          };

          transaction.set(cartRef, cartData);
        } else {
          // Update existing cart
          final cartData = cartDoc.data()!;
          final itemsData = List<Map<String, dynamic>>.from(cartData['items'] ?? []);
          
          // Check if product already exists in cart
          final existingItemIndex = itemsData.indexWhere(
            (item) => item['productId'] == product.id,
          );

          if (existingItemIndex != -1) {
            // Update quantity of existing item
            itemsData[existingItemIndex]['quantity'] += quantity;
          } else {
            // Add new item
            final newCartItem = CartItemModel(
              productId: product.id,
              product: product,
              quantity: quantity,
              price: product.price,
              addedAt: DateTime.now(),
            );
            itemsData.add(newCartItem.toMap());
          }

          // Calculate new total
          final totalAmount = itemsData.fold<double>(
            0,
            (sum, item) => sum + (item['price'] * item['quantity']),
          );

          transaction.update(cartRef, {
            'items': itemsData,
            'totalAmount': totalAmount,
            'updatedAt': FieldValue.serverTimestamp(),
          });
        }
      });
    } catch (e) {
      throw Exception('Failed to add item to cart: $e');
    }
  }

  // Update item quantity
  Future<void> updateItemQuantity(String userId, String productId, int quantity) async {
    try {
      final cartRef = _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId);

      await _firestore.runTransaction((transaction) async {
        final cartDoc = await transaction.get(cartRef);
        
        if (!cartDoc.exists) return;

        final cartData = cartDoc.data()!;
        final itemsData = List<Map<String, dynamic>>.from(cartData['items'] ?? []);
        
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          itemsData.removeWhere((item) => item['productId'] == productId);
        } else {
          // Update quantity
          final itemIndex = itemsData.indexWhere(
            (item) => item['productId'] == productId,
          );
          
          if (itemIndex != -1) {
            itemsData[itemIndex]['quantity'] = quantity;
          }
        }

        // Calculate new total
        final totalAmount = itemsData.fold<double>(
          0,
          (sum, item) => sum + (item['price'] * item['quantity']),
        );

        transaction.update(cartRef, {
          'items': itemsData,
          'totalAmount': totalAmount,
          'updatedAt': FieldValue.serverTimestamp(),
        });
      });
    } catch (e) {
      throw Exception('Failed to update item quantity: $e');
    }
  }

  // Remove item from cart
  Future<void> removeFromCart(String userId, String productId) async {
    try {
      await updateItemQuantity(userId, productId, 0);
    } catch (e) {
      throw Exception('Failed to remove item from cart: $e');
    }
  }

  // Clear cart
  Future<void> clearCart(String userId) async {
    try {
      await _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId)
          .update({
        'items': [],
        'totalAmount': 0.0,
        'discountCode': null,
        'discountAmount': 0.0,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to clear cart: $e');
    }
  }

  // Apply discount code
  Future<void> applyDiscountCode(String userId, String discountCode, double discountAmount) async {
    try {
      await _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId)
          .update({
        'discountCode': discountCode,
        'discountAmount': discountAmount,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to apply discount code: $e');
    }
  }

  // Remove discount code
  Future<void> removeDiscountCode(String userId) async {
    try {
      await _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId)
          .update({
        'discountCode': null,
        'discountAmount': 0.0,
        'updatedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      throw Exception('Failed to remove discount code: $e');
    }
  }

  // Get cart item count
  Future<int> getCartItemCount(String userId) async {
    try {
      final cartDoc = await _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId)
          .get();

      if (!cartDoc.exists || cartDoc.data() == null) {
        return 0;
      }

      final itemsData = List<Map<String, dynamic>>.from(cartDoc.data()!['items'] ?? []);
      return itemsData.fold<int>(
        0,
        (sum, item) => sum + (item['quantity'] as int),
      );
    } catch (e) {
      return 0;
    }
  }

  // Validate cart items (check stock availability)
  Future<List<String>> validateCartItems(String userId) async {
    try {
      final cartDoc = await _firestore
          .collection(AppConstants.cartsCollection)
          .doc(userId)
          .get();

      if (!cartDoc.exists || cartDoc.data() == null) {
        return [];
      }

      final itemsData = List<Map<String, dynamic>>.from(cartDoc.data()!['items'] ?? []);
      final unavailableItems = <String>[];

      for (final itemData in itemsData) {
        final productId = itemData['productId'] as String;
        final quantity = itemData['quantity'] as int;
        
        final isAvailable = await _productService.isProductAvailable(productId, quantity);
        if (!isAvailable) {
          final product = await _productService.getProductById(productId);
          unavailableItems.add(product?.name ?? 'Unknown Product');
        }
      }

      return unavailableItems;
    } catch (e) {
      throw Exception('Failed to validate cart items: $e');
    }
  }
}

