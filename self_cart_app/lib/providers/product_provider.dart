import 'package:flutter/material.dart';
import '../models/product_model.dart';
import '../services/product_service.dart';

class ProductProvider extends ChangeNotifier {
  final ProductService _productService = ProductService();
  
  List<ProductModel> _products = [];
  List<ProductModel> _filteredProducts = [];
  List<String> _categories = [];
  String _selectedCategory = '';
  String _searchQuery = '';
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  List<ProductModel> get products => _filteredProducts;
  List<ProductModel> get allProducts => _products;
  List<String> get categories => _categories;
  String get selectedCategory => _selectedCategory;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  ProductProvider() {
    _initializeProducts();
  }

  // Initialize products stream
  void _initializeProducts() {
    _setLoading(true);
    _productService.getProducts().listen(
      (products) {
        _products = products;
        _applyFilters();
        _setLoading(false);
      },
      onError: (error) {
        _setError(error.toString());
        _setLoading(false);
      },
    );
    
    _loadCategories();
  }

  // Load categories
  Future<void> _loadCategories() async {
    try {
      _categories = await _productService.getCategories();
      notifyListeners();
    } catch (e) {
      _setError(e.toString());
    }
  }

  // Apply filters and search
  void _applyFilters() {
    _filteredProducts = _products.where((product) {
      // Category filter
      if (_selectedCategory.isNotEmpty && product.category != _selectedCategory) {
        return false;
      }
      
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return product.name.toLowerCase().contains(query) ||
               product.description.toLowerCase().contains(query) ||
               product.category.toLowerCase().contains(query);
      }
      
      return true;
    }).toList();
    
    notifyListeners();
  }

  // Set selected category
  void setSelectedCategory(String category) {
    _selectedCategory = category;
    _applyFilters();
  }

  // Clear category filter
  void clearCategoryFilter() {
    _selectedCategory = '';
    _applyFilters();
  }

  // Set search query
  void setSearchQuery(String query) {
    _searchQuery = query;
    _applyFilters();
  }

  // Clear search
  void clearSearch() {
    _searchQuery = '';
    _applyFilters();
  }

  // Get product by ID
  Future<ProductModel?> getProductById(String productId) async {
    try {
      return await _productService.getProductById(productId);
    } catch (e) {
      _setError(e.toString());
      return null;
    }
  }

  // Get product by barcode
  Future<ProductModel?> getProductByBarcode(String barcode) async {
    _setLoading(true);
    _clearError();

    try {
      final product = await _productService.getProductByBarcode(barcode);
      _setLoading(false);
      return product;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return null;
    }
  }

  // Get product by QR code
  Future<ProductModel?> getProductByQRCode(String qrCode) async {
    _setLoading(true);
    _clearError();

    try {
      final product = await _productService.getProductByQRCode(qrCode);
      _setLoading(false);
      return product;
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
      return null;
    }
  }

  // Refresh products
  Future<void> refreshProducts() async {
    _setLoading(true);
    _clearError();

    try {
      // The stream will automatically update the products
      await _loadCategories();
      _setLoading(false);
    } catch (e) {
      _setError(e.toString());
      _setLoading(false);
    }
  }

  // Get products by category
  List<ProductModel> getProductsByCategory(String category) {
    return _products.where((product) => product.category == category).toList();
  }

  // Get featured products (you can customize this logic)
  List<ProductModel> getFeaturedProducts({int limit = 10}) {
    return _products.take(limit).toList();
  }

  // Get products on sale (you can customize this logic)
  List<ProductModel> getProductsOnSale({int limit = 10}) {
    // This is a placeholder - you might want to add a sale field to your product model
    return _products.take(limit).toList();
  }

  // Search products with suggestions
  List<String> getSearchSuggestions(String query) {
    if (query.isEmpty) return [];
    
    final suggestions = <String>{};
    final lowerQuery = query.toLowerCase();
    
    for (final product in _products) {
      if (product.name.toLowerCase().contains(lowerQuery)) {
        suggestions.add(product.name);
      }
      if (product.category.toLowerCase().contains(lowerQuery)) {
        suggestions.add(product.category);
      }
    }
    
    return suggestions.take(5).toList();
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

