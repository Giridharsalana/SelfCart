import 'package:flutter/material.dart';
import '../models/cart_model.dart';
import '../models/product_model.dart';
import '../services/cart_service.dart';
import '../services/auth_service.dart';

class CartProvider extends ChangeNotifier {
  final CartService _cartService = CartService();
  final AuthService _authService = AuthService();
  
  CartModel? _cart;
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  CartModel? get cart => _cart;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get itemCount => _cart?.itemCount ?? 0;
  double get subtotal => _cart?.subtotal ?? 0.0;
  double get discountAmount => _cart?.discountAmount ?? 0.0;
  double get finalAmount => _cart?.finalAmount ?? 0.0;
  bool get isEmpty => _cart?.isEmpty ?? true;
  bool get isNotEmpty => _cart?.isNotEmpty ?? false;

  CartProvider() {
    _initializeCart();
  }

  // Initialize cart stream
  void _initializeCart() {
    _authService.authStateChanges.listen((user) {
      if (user != null) {
        _cartService.getUserCart(user.uid).listen((cart) {
          _cart = cart;
          notifyListeners();
        });
      } else {
        _cart = null;
        notifyListeners();
      }
    });
  }

  // Add item to cart
  Future<bool> addToCart(ProductModel product, {int quantity = 1}) async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.addToCart(user.uid, product, quantity);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Update item quantity
  Future<bool> updateItemQuantity(String productId, int quantity) async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.updateItemQuantity(user.uid, productId, quantity);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Increment item quantity
  Future<bool> incrementItem(String productId) async {
    final currentItem = _cart?.items.firstWhere(
      (item) => item.productId == productId,
      orElse: () => throw Exception('Item not found'),
    );
    
    if (currentItem == null) return false;
    
    return await updateItemQuantity(productId, currentItem.quantity + 1);
  }

  // Decrement item quantity
  Future<bool> decrementItem(String productId) async {
    final currentItem = _cart?.items.firstWhere(
      (item) => item.productId == productId,
      orElse: () => throw Exception('Item not found'),
    );
    
    if (currentItem == null) return false;
    
    final newQuantity = currentItem.quantity - 1;
    return await updateItemQuantity(productId, newQuantity);
  }

  // Remove item from cart
  Future<bool> removeFromCart(String productId) async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.removeFromCart(user.uid, productId);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Clear cart
  Future<bool> clearCart() async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.clearCart(user.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Apply discount code
  Future<bool> applyDiscountCode(String discountCode, double discountAmount) async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.applyDiscountCode(user.uid, discountCode, discountAmount);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Remove discount code
  Future<bool> removeDiscountCode() async {
    final user = _authService.currentUser;
    if (user == null) return false;

    _setLoading(true);
    _clearError();

    try {
      await _cartService.removeDiscountCode(user.uid);
      _setLoading(false);
      return true;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return false;
    }
  }

  // Validate cart items
  Future<List<String>> validateCartItems() async {
    final user = _authService.currentUser;
    if (user == null) return [];

    try {
      return await _cartService.validateCartItems(user.uid);
    } catch (e) {
      _setError(e.toString());
      return [];
    }
  }

  // Check if product is in cart
  bool isProductInCart(String productId) {
    return _cart?.items.any((item) => item.productId == productId) ?? false;
  }

  // Get product quantity in cart
  int getProductQuantity(String productId) {
    final item = _cart?.items.firstWhere(
      (item) => item.productId == productId,
      orElse: () => throw Exception('Item not found'),
    );
    return item?.quantity ?? 0;
  }

  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}

