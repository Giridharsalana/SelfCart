enum DiscountType { percentage, fixed }

class DiscountCodeModel {
  final String id;
  final String code;
  final DiscountType discountType;
  final double discountValue;
  final double minOrderAmount;
  final int maxUses;
  final int currentUses;
  final bool isActive;
  final DateTime validFrom;
  final DateTime validUntil;

  DiscountCodeModel({
    required this.id,
    required this.code,
    required this.discountType,
    required this.discountValue,
    required this.minOrderAmount,
    required this.maxUses,
    required this.currentUses,
    required this.isActive,
    required this.validFrom,
    required this.validUntil,
  });

  factory DiscountCodeModel.fromMap(Map<String, dynamic> map, String id) {
    return DiscountCodeModel(
      id: id,
      code: map['code'] ?? '',
      discountType: DiscountType.values.firstWhere(
        (type) => type.name == map['discountType'],
        orElse: () => DiscountType.percentage,
      ),
      discountValue: (map['discountValue'] ?? 0).toDouble(),
      minOrderAmount: (map['minOrderAmount'] ?? 0).toDouble(),
      maxUses: map['maxUses'] ?? 0,
      currentUses: map['currentUses'] ?? 0,
      isActive: map['isActive'] ?? true,
      validFrom: DateTime.fromMillisecondsSinceEpoch(map['validFrom']),
      validUntil: DateTime.fromMillisecondsSinceEpoch(map['validUntil']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'code': code,
      'discountType': discountType.name,
      'discountValue': discountValue,
      'minOrderAmount': minOrderAmount,
      'maxUses': maxUses,
      'currentUses': currentUses,
      'isActive': isActive,
      'validFrom': validFrom.millisecondsSinceEpoch,
      'validUntil': validUntil.millisecondsSinceEpoch,
    };
  }

  DiscountCodeModel copyWith({
    String? id,
    String? code,
    DiscountType? discountType,
    double? discountValue,
    double? minOrderAmount,
    int? maxUses,
    int? currentUses,
    bool? isActive,
    DateTime? validFrom,
    DateTime? validUntil,
  }) {
    return DiscountCodeModel(
      id: id ?? this.id,
      code: code ?? this.code,
      discountType: discountType ?? this.discountType,
      discountValue: discountValue ?? this.discountValue,
      minOrderAmount: minOrderAmount ?? this.minOrderAmount,
      maxUses: maxUses ?? this.maxUses,
      currentUses: currentUses ?? this.currentUses,
      isActive: isActive ?? this.isActive,
      validFrom: validFrom ?? this.validFrom,
      validUntil: validUntil ?? this.validUntil,
    );
  }

  bool get isValid {
    final now = DateTime.now();
    return isActive &&
        currentUses < maxUses &&
        now.isAfter(validFrom) &&
        now.isBefore(validUntil);
  }

  double calculateDiscount(double orderAmount) {
    if (!isValid || orderAmount < minOrderAmount) {
      return 0;
    }

    switch (discountType) {
      case DiscountType.percentage:
        return (orderAmount * discountValue) / 100;
      case DiscountType.fixed:
        return discountValue;
    }
  }
}

