import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../models/order_model.dart';
import '../utils/constants.dart';

enum PaymentGateway { razorpay, stripe, paypal, upi }

class PaymentService {
  static final PaymentService _instance = PaymentService._internal();
  factory PaymentService() => _instance;
  PaymentService._internal();

  late Razorpay _razorpay;
  Function(PaymentSuccessResponse)? _onPaymentSuccess;
  Function(PaymentFailureResponse)? _onPaymentError;
  Function(ExternalWalletResponse)? _onExternalWallet;

  void initialize() {
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  void dispose() {
    _razorpay.clear();
  }

  // Razorpay Payment
  Future<bool> processRazorpayPayment({
    required double amount,
    required String orderId,
    required String userEmail,
    required String userName,
    required String userPhone,
    required Function(PaymentSuccessResponse) onSuccess,
    required Function(PaymentFailureResponse) onError,
    Function(ExternalWalletResponse)? onExternalWallet,
  }) async {
    try {
      _onPaymentSuccess = onSuccess;
      _onPaymentError = onError;
      _onExternalWallet = onExternalWallet;

      var options = {
        'key': 'rzp_test_1DP5mmOlF5G5ag', // Replace with your Razorpay key
        'amount': (amount * 100).toInt(), // Amount in paise
        'name': 'Self Cart',
        'description': 'Payment for Order #$orderId',
        'order_id': orderId,
        'prefill': {
          'contact': userPhone,
          'email': userEmail,
          'name': userName,
        },
        'theme': {
          'color': '#2196F3',
        },
      };

      _razorpay.open(options);
      return true;
    } catch (e) {
      debugPrint('Razorpay Error: $e');
      return false;
    }
  }

  // UPI Payment
  Future<PaymentResult> processUPIPayment({
    required double amount,
    required String orderId,
    required String merchantId,
    required String merchantName,
  }) async {
    try {
      // This is a simplified UPI implementation
      // In a real app, you would integrate with UPI SDK or use deep links
      
      final upiUrl = 'upi://pay?pa=$merchantId@paytm&pn=$merchantName'
          '&am=${amount.toStringAsFixed(2)}&cu=INR&tn=Payment for Order $orderId';
      
      // In a real implementation, you would launch this URL
      // and handle the response from the UPI app
      
      return PaymentResult(
        success: true,
        transactionId: 'UPI_${DateTime.now().millisecondsSinceEpoch}',
        paymentMethod: AppConstants.upiPayment,
      );
    } catch (e) {
      return PaymentResult(
        success: false,
        error: e.toString(),
        paymentMethod: AppConstants.upiPayment,
      );
    }
  }

  // Stripe Payment (Simplified)
  Future<PaymentResult> processStripePayment({
    required double amount,
    required String orderId,
    required String currency,
  }) async {
    try {
      // This is a placeholder for Stripe integration
      // In a real app, you would use the Stripe SDK
      
      // Simulate payment processing
      await Future.delayed(const Duration(seconds: 2));
      
      return PaymentResult(
        success: true,
        transactionId: 'stripe_${DateTime.now().millisecondsSinceEpoch}',
        paymentMethod: AppConstants.stripePayment,
      );
    } catch (e) {
      return PaymentResult(
        success: false,
        error: e.toString(),
        paymentMethod: AppConstants.stripePayment,
      );
    }
  }

  // PayPal Payment (Simplified)
  Future<PaymentResult> processPayPalPayment({
    required double amount,
    required String orderId,
    required String currency,
  }) async {
    try {
      // This is a placeholder for PayPal integration
      // In a real app, you would use the PayPal SDK
      
      // Simulate payment processing
      await Future.delayed(const Duration(seconds: 2));
      
      return PaymentResult(
        success: true,
        transactionId: 'paypal_${DateTime.now().millisecondsSinceEpoch}',
        paymentMethod: AppConstants.paypalPayment,
      );
    } catch (e) {
      return PaymentResult(
        success: false,
        error: e.toString(),
        paymentMethod: AppConstants.paypalPayment,
      );
    }
  }

  // Event handlers for Razorpay
  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    _onPaymentSuccess?.call(response);
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    _onPaymentError?.call(response);
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    _onExternalWallet?.call(response);
  }

  // Verify payment with backend
  Future<bool> verifyPayment({
    required String paymentId,
    required String orderId,
    required String signature,
  }) async {
    try {
      // This should call your backend API to verify the payment
      // For now, we'll simulate verification
      await Future.delayed(const Duration(seconds: 1));
      return true;
    } catch (e) {
      debugPrint('Payment verification error: $e');
      return false;
    }
  }

  // Get available payment methods
  List<PaymentMethod> getAvailablePaymentMethods() {
    return [
      PaymentMethod(
        id: 'razorpay',
        name: 'Credit/Debit Card',
        description: 'Pay securely with your card',
        icon: Icons.credit_card,
        gateway: PaymentGateway.razorpay,
      ),
      PaymentMethod(
        id: 'upi',
        name: 'UPI',
        description: 'Pay with any UPI app',
        icon: Icons.account_balance_wallet,
        gateway: PaymentGateway.upi,
      ),
      PaymentMethod(
        id: 'stripe',
        name: 'Stripe',
        description: 'International payments',
        icon: Icons.payment,
        gateway: PaymentGateway.stripe,
      ),
      PaymentMethod(
        id: 'paypal',
        name: 'PayPal',
        description: 'Pay with PayPal',
        icon: Icons.account_balance,
        gateway: PaymentGateway.paypal,
      ),
    ];
  }
}

class PaymentResult {
  final bool success;
  final String? transactionId;
  final String? error;
  final String paymentMethod;
  final Map<String, dynamic>? additionalData;

  PaymentResult({
    required this.success,
    this.transactionId,
    this.error,
    required this.paymentMethod,
    this.additionalData,
  });
}

class PaymentMethod {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final PaymentGateway gateway;

  PaymentMethod({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.gateway,
  });
}

