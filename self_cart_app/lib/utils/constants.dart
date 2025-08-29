class AppConstants {
  // Firebase Collections
  static const String usersCollection = 'users';
  static const String productsCollection = 'products';
  static const String cartsCollection = 'carts';
  static const String ordersCollection = 'orders';
  static const String discountCodesCollection = 'discountCodes';
  static const String analyticsCollection = 'analytics';
  static const String adminsCollection = 'admins';

  // Storage Paths
  static const String productImagesPath = 'products';
  static const String userImagesPath = 'users';
  static const String receiptsPath = 'receipts';

  // Shared Preferences Keys
  static const String userIdKey = 'user_id';
  static const String userEmailKey = 'user_email';
  static const String isLoggedInKey = 'is_logged_in';
  static const String themeKey = 'theme_mode';

  // Payment Methods
  static const String upiPayment = 'UPI';
  static const String cardPayment = 'Card';
  static const String paypalPayment = 'PayPal';
  static const String stripePayment = 'Stripe';

  // Error Messages
  static const String networkError = 'Network error. Please check your connection.';
  static const String authError = 'Authentication failed. Please try again.';
  static const String genericError = 'Something went wrong. Please try again.';
  static const String productNotFound = 'Product not found.';
  static const String cartEmpty = 'Your cart is empty.';
  static const String invalidDiscountCode = 'Invalid or expired discount code.';

  // Success Messages
  static const String loginSuccess = 'Login successful!';
  static const String signupSuccess = 'Account created successfully!';
  static const String productAdded = 'Product added to cart!';
  static const String orderPlaced = 'Order placed successfully!';
  static const String discountApplied = 'Discount code applied!';

  // Validation
  static const int minPasswordLength = 6;
  static const int maxProductNameLength = 100;
  static const int maxDescriptionLength = 500;

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double smallPadding = 8.0;
  static const double largePadding = 24.0;
  static const double borderRadius = 8.0;
  static const double cardElevation = 2.0;

  // Animation Durations
  static const Duration shortAnimation = Duration(milliseconds: 200);
  static const Duration mediumAnimation = Duration(milliseconds: 300);
  static const Duration longAnimation = Duration(milliseconds: 500);

  // Limits
  static const int maxCartItems = 50;
  static const int maxOrderHistory = 100;
  static const double maxOrderAmount = 50000.0;
  static const double minOrderAmount = 1.0;
}

