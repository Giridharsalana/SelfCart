import 'dart:io';
import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/order_model.dart';
import '../models/user_model.dart';
import '../utils/constants.dart';

class ReceiptService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Generate PDF receipt
  Future<Uint8List> generateReceiptPDF({
    required OrderModel order,
    required UserModel user,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(20),
                decoration: pw.BoxDecoration(
                  color: PdfColors.blue,
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(
                      'SELF CART',
                      style: pw.TextStyle(
                        fontSize: 24,
                        fontWeight: pw.FontWeight.bold,
                        color: PdfColors.white,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Digital Receipt',
                      style: pw.TextStyle(
                        fontSize: 14,
                        color: PdfColors.white,
                      ),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),

              // Order Information
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'Order ID: ${order.id}',
                        style: pw.TextStyle(
                          fontSize: 16,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        'Date: ${_formatDate(order.createdAt)}',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.Text(
                        'Payment Method: ${order.paymentMethod}',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.Text(
                        'Status: ${order.orderStatus.name.toUpperCase()}',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Customer Details',
                        style: pw.TextStyle(
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                        ),
                      ),
                      pw.SizedBox(height: 4),
                      pw.Text(
                        user.displayName ?? 'N/A',
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      pw.Text(
                        user.email,
                        style: const pw.TextStyle(fontSize: 12),
                      ),
                      if (user.phone != null)
                        pw.Text(
                          user.phone!,
                          style: const pw.TextStyle(fontSize: 12),
                        ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Items Table
              pw.Text(
                'Order Items',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 10),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300),
                children: [
                  // Header
                  pw.TableRow(
                    decoration: pw.BoxDecoration(color: PdfColors.grey100),
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Item',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Qty',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                          textAlign: pw.TextAlign.center,
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Price',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                          textAlign: pw.TextAlign.right,
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          'Total',
                          style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                          textAlign: pw.TextAlign.right,
                        ),
                      ),
                    ],
                  ),
                  // Items
                  ...order.items.map((item) => pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Column(
                          crossAxisAlignment: pw.CrossAxisAlignment.start,
                          children: [
                            pw.Text(
                              item.product.name,
                              style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                            ),
                            pw.Text(
                              item.product.description,
                              style: const pw.TextStyle(fontSize: 10),
                            ),
                          ],
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          item.quantity.toString(),
                          textAlign: pw.TextAlign.center,
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          '₹${item.price.toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                        ),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text(
                          '₹${item.totalPrice.toStringAsFixed(2)}',
                          textAlign: pw.TextAlign.right,
                        ),
                      ),
                    ],
                  )),
                ],
              ),
              pw.SizedBox(height: 20),

              // Summary
              pw.Container(
                width: double.infinity,
                padding: const pw.EdgeInsets.all(16),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey300),
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('Subtotal:'),
                        pw.Text('₹${(order.totalAmount + order.discountAmount).toStringAsFixed(2)}'),
                      ],
                    ),
                    if (order.discountAmount > 0) ...[
                      pw.SizedBox(height: 4),
                      pw.Row(
                        mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text('Discount:'),
                          pw.Text(
                            '-₹${order.discountAmount.toStringAsFixed(2)}',
                            style: const pw.TextStyle(color: PdfColors.green),
                          ),
                        ],
                      ),
                    ],
                    pw.Divider(),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                          'Total Amount:',
                          style: pw.TextStyle(
                            fontSize: 16,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        pw.Text(
                          '₹${order.finalAmount.toStringAsFixed(2)}',
                          style: pw.TextStyle(
                            fontSize: 16,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 20),

              // Footer
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'Thank you for shopping with Self Cart!',
                      style: pw.TextStyle(
                        fontSize: 14,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      'For support, contact us at support@selfcart.com',
                      style: const pw.TextStyle(fontSize: 10),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Generated on ${_formatDate(DateTime.now())}',
                      style: const pw.TextStyle(fontSize: 8),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  // Upload receipt to Firebase Storage
  Future<String> uploadReceipt({
    required String orderId,
    required Uint8List pdfBytes,
  }) async {
    try {
      final fileName = 'receipt_${orderId}_${DateTime.now().millisecondsSinceEpoch}.pdf';
      final ref = _storage
          .ref()
          .child(AppConstants.receiptsPath)
          .child(orderId)
          .child(fileName);

      final uploadTask = ref.putData(
        pdfBytes,
        SettableMetadata(
          contentType: 'application/pdf',
          customMetadata: {
            'orderId': orderId,
            'generatedAt': DateTime.now().toIso8601String(),
          },
        ),
      );

      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      return downloadUrl;
    } catch (e) {
      throw Exception('Failed to upload receipt: $e');
    }
  }

  // Generate and upload receipt
  Future<ReceiptModel> generateAndUploadReceipt({
    required OrderModel order,
    required UserModel user,
  }) async {
    try {
      // Generate PDF
      final pdfBytes = await generateReceiptPDF(order: order, user: user);
      
      // Upload to Firebase Storage
      final receiptUrl = await uploadReceipt(
        orderId: order.id,
        pdfBytes: pdfBytes,
      );

      // Create receipt model
      final receiptId = 'receipt_${order.id}_${DateTime.now().millisecondsSinceEpoch}';
      
      return ReceiptModel(
        receiptId: receiptId,
        receiptUrl: receiptUrl,
        generatedAt: DateTime.now(),
      );
    } catch (e) {
      throw Exception('Failed to generate and upload receipt: $e');
    }
  }

  // Download receipt
  Future<Uint8List> downloadReceipt(String receiptUrl) async {
    try {
      final ref = _storage.refFromURL(receiptUrl);
      final data = await ref.getData();
      return data!;
    } catch (e) {
      throw Exception('Failed to download receipt: $e');
    }
  }

  // Print receipt
  Future<void> printReceipt(Uint8List pdfBytes) async {
    try {
      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdfBytes,
      );
    } catch (e) {
      throw Exception('Failed to print receipt: $e');
    }
  }

  // Share receipt
  Future<void> shareReceipt(Uint8List pdfBytes, String orderId) async {
    try {
      await Printing.sharePdf(
        bytes: pdfBytes,
        filename: 'receipt_$orderId.pdf',
      );
    } catch (e) {
      throw Exception('Failed to share receipt: $e');
    }
  }

  // Helper method to format date
  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year} '
           '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}

