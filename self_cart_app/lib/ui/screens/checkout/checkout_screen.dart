import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/cart_provider.dart';
import '../../../services/payment_service.dart';
import '../../../services/order_service.dart';
import '../../../services/discount_service.dart';
import '../../../services/receipt_service.dart';
import '../../../utils/constants.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/loading_overlay.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final PaymentService _paymentService = PaymentService();
  final OrderService _orderService = OrderService();
  final DiscountService _discountService = DiscountService();
  final ReceiptService _receiptService = ReceiptService();
  
  final _discountController = TextEditingController();
  
  PaymentMethod? _selectedPaymentMethod;
  bool _isProcessingPayment = false;
  bool _isApplyingDiscount = false;
  String? _discountError;

  @override
  void initState() {
    super.initState();
    _paymentService.initialize();
  }

  @override
  void dispose() {
    _discountController.dispose();
    _paymentService.dispose();
    super.dispose();
  }

  Future<void> _applyDiscountCode() async {
    final code = _discountController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isApplyingDiscount = true;
      _discountError = null;
    });

    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    final cart = cartProvider.cart;
    
    if (cart == null) {
      setState(() {
        _isApplyingDiscount = false;
        _discountError = 'Cart is empty';
      });
      return;
    }

    try {
      final result = await _discountService.validateDiscountCode(
        code: code,
        orderAmount: cart.subtotal,
        userId: Provider.of<AuthProvider>(context, listen: false).user!.uid,
      );

      if (result.success && result.discountAmount != null) {
        await cartProvider.applyDiscountCode(code, result.discountAmount!);
        _showSuccessSnackBar('Discount code applied successfully!');
      } else {
        setState(() {
          _discountError = result.message;
        });
      }
    } catch (e) {
      setState(() {
        _discountError = 'Failed to apply discount code';
      });
    }

    setState(() {
      _isApplyingDiscount = false;
    });
  }

  Future<void> _removeDiscountCode() async {
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    await cartProvider.removeDiscountCode();
    _discountController.clear();
    setState(() {
      _discountError = null;
    });
  }

  Future<void> _processPayment() async {
    if (_selectedPaymentMethod == null) {
      _showErrorSnackBar('Please select a payment method');
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final cartProvider = Provider.of<CartProvider>(context, listen: false);
    
    final user = authProvider.user;
    final userModel = authProvider.userModel;
    final cart = cartProvider.cart;

    if (user == null || cart == null || cart.isEmpty) {
      _showErrorSnackBar('Invalid user or empty cart');
      return;
    }

    setState(() {
      _isProcessingPayment = true;
    });

    try {
      // Validate cart items
      final unavailableItems = await cartProvider.validateCartItems();
      if (unavailableItems.isNotEmpty) {
        _showErrorSnackBar('Some items are no longer available: ${unavailableItems.join(', ')}');
        setState(() {
          _isProcessingPayment = false;
        });
        return;
      }

      // Create order
      final orderId = await _orderService.createOrder(
        userId: user.uid,
        cart: cart,
        paymentMethod: _selectedPaymentMethod!.name,
      );

      // Process payment based on selected method
      bool paymentSuccess = false;
      String? transactionId;

      switch (_selectedPaymentMethod!.gateway) {
        case PaymentGateway.razorpay:
          paymentSuccess = await _processRazorpayPayment(
            orderId: orderId,
            amount: cart.finalAmount,
            userEmail: user.email!,
            userName: userModel?.displayName ?? 'User',
            userPhone: userModel?.phone ?? '',
          );
          break;
        case PaymentGateway.upi:
          final result = await _paymentService.processUPIPayment(
            amount: cart.finalAmount,
            orderId: orderId,
            merchantId: 'selfcart',
            merchantName: 'Self Cart',
          );
          paymentSuccess = result.success;
          transactionId = result.transactionId;
          break;
        case PaymentGateway.stripe:
          final result = await _paymentService.processStripePayment(
            amount: cart.finalAmount,
            orderId: orderId,
            currency: 'INR',
          );
          paymentSuccess = result.success;
          transactionId = result.transactionId;
          break;
        case PaymentGateway.paypal:
          final result = await _paymentService.processPayPalPayment(
            amount: cart.finalAmount,
            orderId: orderId,
            currency: 'USD',
          );
          paymentSuccess = result.success;
          transactionId = result.transactionId;
          break;
      }

      if (paymentSuccess) {
        await _handlePaymentSuccess(orderId, transactionId);
      } else {
        await _handlePaymentFailure(orderId);
      }
    } catch (e) {
      _showErrorSnackBar('Payment processing failed: $e');
    }

    setState(() {
      _isProcessingPayment = false;
    });
  }

  Future<bool> _processRazorpayPayment({
    required String orderId,
    required double amount,
    required String userEmail,
    required String userName,
    required String userPhone,
  }) async {
    final completer = Completer<bool>();

    await _paymentService.processRazorpayPayment(
      amount: amount,
      orderId: orderId,
      userEmail: userEmail,
      userName: userName,
      userPhone: userPhone,
      onSuccess: (response) {
        completer.complete(true);
      },
      onError: (response) {
        completer.complete(false);
      },
    );

    return completer.future;
  }

  Future<void> _handlePaymentSuccess(String orderId, String? transactionId) async {
    try {
      // Update order payment status
      await _orderService.updateOrderPaymentStatus(
        orderId: orderId,
        paymentStatus: PaymentStatus.completed,
        transactionId: transactionId,
      );

      // Generate receipt
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final order = await _orderService.getOrderById(orderId);
      
      if (order != null && authProvider.userModel != null) {
        final receipt = await _receiptService.generateAndUploadReceipt(
          order: order,
          user: authProvider.userModel!,
        );

        // Add receipt to order
        await _orderService.addReceiptToOrder(
          orderId: orderId,
          receiptId: receipt.receiptId,
          receiptUrl: receipt.receiptUrl,
        );
      }

      // Clear cart
      final cartProvider = Provider.of<CartProvider>(context, listen: false);
      await cartProvider.clearCart();

      // Show success and navigate
      _showSuccessSnackBar(AppConstants.orderPlaced);
      
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil(
          '/home',
          (route) => false,
        );
      }
    } catch (e) {
      _showErrorSnackBar('Order processing failed: $e');
    }
  }

  Future<void> _handlePaymentFailure(String orderId) async {
    try {
      // Update order payment status
      await _orderService.updateOrderPaymentStatus(
        orderId: orderId,
        paymentStatus: PaymentStatus.failed,
      );

      _showErrorSnackBar('Payment failed. Please try again.');
    } catch (e) {
      _showErrorSnackBar('Payment failed and order update failed: $e');
    }
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
      ),
      body: Consumer<CartProvider>(
        builder: (context, cartProvider, child) {
          final cart = cartProvider.cart;
          
          if (cart == null || cart.isEmpty) {
            return const Center(
              child: Text('Your cart is empty'),
            );
          }

          return LoadingOverlay(
            isLoading: _isProcessingPayment,
            message: 'Processing payment...',
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppConstants.defaultPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Order Summary
                  _buildOrderSummary(cart),
                  const SizedBox(height: 24),
                  
                  // Discount Code Section
                  _buildDiscountSection(cart),
                  const SizedBox(height: 24),
                  
                  // Payment Methods
                  _buildPaymentMethods(),
                  const SizedBox(height: 24),
                  
                  // Place Order Button
                  CustomButton(
                    text: 'Place Order - ₹${cart.finalAmount.toStringAsFixed(2)}',
                    onPressed: _selectedPaymentMethod != null ? _processPayment : null,
                    isLoading: _isProcessingPayment,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildOrderSummary(cart) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Summary',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...cart.items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text('${item.product.name} x${item.quantity}'),
                  ),
                  Text('₹${item.totalPrice.toStringAsFixed(2)}'),
                ],
              ),
            )),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal:'),
                Text('₹${cart.subtotal.toStringAsFixed(2)}'),
              ],
            ),
            if (cart.discountAmount > 0) ...[
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Discount:'),
                  Text(
                    '-₹${cart.discountAmount.toStringAsFixed(2)}',
                    style: const TextStyle(color: Colors.green),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total:',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '₹${cart.finalAmount.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDiscountSection(cart) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Discount Code',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (cart.discountCode != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Discount code "${cart.discountCode}" applied',
                        style: const TextStyle(color: Colors.green),
                      ),
                    ),
                    TextButton(
                      onPressed: _removeDiscountCode,
                      child: const Text('Remove'),
                    ),
                  ],
                ),
              ),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      controller: _discountController,
                      label: 'Enter discount code',
                      hint: 'WELCOME10',
                    ),
                  ),
                  const SizedBox(width: 12),
                  CustomButton(
                    text: 'Apply',
                    onPressed: _applyDiscountCode,
                    isLoading: _isApplyingDiscount,
                  ),
                ],
              ),
              if (_discountError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _discountError!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethods() {
    final paymentMethods = _paymentService.getAvailablePaymentMethods();
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payment Method',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...paymentMethods.map((method) => RadioListTile<PaymentMethod>(
              title: Text(method.name),
              subtitle: Text(method.description),
              value: method,
              groupValue: _selectedPaymentMethod,
              onChanged: (value) {
                setState(() {
                  _selectedPaymentMethod = value;
                });
              },
              secondary: Icon(method.icon),
            )),
          ],
        ),
      ),
    );
  }
}

