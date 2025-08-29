import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/discount_code_model.dart';
import '../utils/constants.dart';

class DiscountService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Validate and apply discount code
  Future<DiscountResult> validateDiscountCode({
    required String code,
    required double orderAmount,
    required String userId,
  }) async {
    try {
      final querySnapshot = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .where('code', isEqualTo: code.toUpperCase())
          .limit(1)
          .get();

      if (querySnapshot.docs.isEmpty) {
        return DiscountResult(
          success: false,
          message: 'Invalid discount code',
        );
      }

      final doc = querySnapshot.docs.first;
      final discountCode = DiscountCodeModel.fromMap(doc.data(), doc.id);

      // Check if discount code is valid
      if (!discountCode.isValid) {
        return DiscountResult(
          success: false,
          message: 'Discount code has expired or is not active',
        );
      }

      // Check minimum order amount
      if (orderAmount < discountCode.minOrderAmount) {
        return DiscountResult(
          success: false,
          message: 'Minimum order amount of ₹${discountCode.minOrderAmount.toStringAsFixed(2)} required',
        );
      }

      // Check usage limit
      if (discountCode.currentUses >= discountCode.maxUses) {
        return DiscountResult(
          success: false,
          message: 'Discount code usage limit exceeded',
        );
      }

      // Check if user has already used this code (optional - implement if needed)
      // You can add a subcollection to track user usage

      // Calculate discount amount
      final discountAmount = discountCode.calculateDiscount(orderAmount);

      return DiscountResult(
        success: true,
        message: 'Discount code applied successfully',
        discountCode: discountCode,
        discountAmount: discountAmount,
      );
    } catch (e) {
      return DiscountResult(
        success: false,
        message: 'Failed to validate discount code: $e',
      );
    }
  }

  // Apply discount code (increment usage count)
  Future<void> applyDiscountCode(String discountCodeId) async {
    try {
      await _firestore
          .collection(AppConstants.discountCodesCollection)
          .doc(discountCodeId)
          .update({
        'currentUses': FieldValue.increment(1),
      });
    } catch (e) {
      throw Exception('Failed to apply discount code: $e');
    }
  }

  // Get all discount codes (Admin)
  Stream<List<DiscountCodeModel>> getDiscountCodes() {
    return _firestore
        .collection(AppConstants.discountCodesCollection)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return DiscountCodeModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  // Get active discount codes
  Stream<List<DiscountCodeModel>> getActiveDiscountCodes() {
    final now = Timestamp.now();
    return _firestore
        .collection(AppConstants.discountCodesCollection)
        .where('isActive', isEqualTo: true)
        .where('validFrom', isLessThanOrEqualTo: now)
        .where('validUntil', isGreaterThan: now)
        .orderBy('validUntil')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs.map((doc) {
        return DiscountCodeModel.fromMap(doc.data(), doc.id);
      }).toList();
    });
  }

  // Create discount code (Admin)
  Future<String> createDiscountCode(DiscountCodeModel discountCode) async {
    try {
      final docRef = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .add(discountCode.toMap());
      return docRef.id;
    } catch (e) {
      throw Exception('Failed to create discount code: $e');
    }
  }

  // Update discount code (Admin)
  Future<void> updateDiscountCode(String discountCodeId, Map<String, dynamic> data) async {
    try {
      await _firestore
          .collection(AppConstants.discountCodesCollection)
          .doc(discountCodeId)
          .update(data);
    } catch (e) {
      throw Exception('Failed to update discount code: $e');
    }
  }

  // Delete discount code (Admin)
  Future<void> deleteDiscountCode(String discountCodeId) async {
    try {
      await _firestore
          .collection(AppConstants.discountCodesCollection)
          .doc(discountCodeId)
          .update({
        'isActive': false,
      });
    } catch (e) {
      throw Exception('Failed to delete discount code: $e');
    }
  }

  // Get discount code by ID
  Future<DiscountCodeModel?> getDiscountCodeById(String discountCodeId) async {
    try {
      final doc = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .doc(discountCodeId)
          .get();

      if (doc.exists && doc.data() != null) {
        return DiscountCodeModel.fromMap(doc.data()!, doc.id);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get discount code: $e');
    }
  }

  // Get discount code statistics (Admin)
  Future<DiscountStatistics> getDiscountStatistics() async {
    try {
      final allCodesQuery = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .get();

      final activeCodesQuery = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .where('isActive', isEqualTo: true)
          .get();

      int totalUsage = 0;
      double totalDiscountGiven = 0;

      for (final doc in allCodesQuery.docs) {
        final data = doc.data();
        final currentUses = data['currentUses'] ?? 0;
        final discountValue = (data['discountValue'] ?? 0).toDouble();
        final discountType = data['discountType'] ?? 'percentage';

        totalUsage += currentUses as int;
        
        // Approximate discount given (this is simplified)
        if (discountType == 'fixed') {
          totalDiscountGiven += discountValue * currentUses;
        }
        // For percentage discounts, we'd need order data to calculate exact amounts
      }

      return DiscountStatistics(
        totalCodes: allCodesQuery.docs.length,
        activeCodes: activeCodesQuery.docs.length,
        totalUsage: totalUsage,
        totalDiscountGiven: totalDiscountGiven,
      );
    } catch (e) {
      throw Exception('Failed to get discount statistics: $e');
    }
  }

  // Check if discount code exists
  Future<bool> discountCodeExists(String code) async {
    try {
      final querySnapshot = await _firestore
          .collection(AppConstants.discountCodesCollection)
          .where('code', isEqualTo: code.toUpperCase())
          .limit(1)
          .get();

      return querySnapshot.docs.isNotEmpty;
    } catch (e) {
      return false;
    }
  }
}

class DiscountResult {
  final bool success;
  final String message;
  final DiscountCodeModel? discountCode;
  final double? discountAmount;

  DiscountResult({
    required this.success,
    required this.message,
    this.discountCode,
    this.discountAmount,
  });
}

class DiscountStatistics {
  final int totalCodes;
  final int activeCodes;
  final int totalUsage;
  final double totalDiscountGiven;

  DiscountStatistics({
    required this.totalCodes,
    required this.activeCodes,
    required this.totalUsage,
    required this.totalDiscountGiven,
  });
}

