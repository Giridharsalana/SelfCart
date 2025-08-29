# Firebase Backend Configuration

## Firebase Project Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `self-cart-app`
4. Enable Google Analytics (optional but recommended)
5. Select or create a Google Analytics account
6. Click "Create project"

### 2. Enable Firebase Services

#### Authentication
1. In Firebase Console, navigate to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable the following providers:
   - Email/Password
   - Google
   - Facebook (optional)
   - Twitter (optional)

#### Firestore Database
1. Navigate to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll configure security rules later)
4. Select a location closest to your users

#### Cloud Storage
1. Navigate to "Storage"
2. Click "Get started"
3. Choose "Start in test mode"
4. Select the same location as Firestore

#### Cloud Functions
1. Navigate to "Functions"
2. Click "Get started"
3. Follow the setup instructions to install Firebase CLI

## Firestore Database Structure

### Collections and Documents

```
users/
├── {userId}/
│   ├── email: string
│   ├── displayName: string
│   ├── photoURL: string
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── profile: map
│       ├── phone: string
│       ├── address: string
│       └── preferences: map

products/
├── {productId}/
│   ├── name: string
│   ├── description: string
│   ├── price: number
│   ├── category: string
│   ├── barcode: string
│   ├── qrCode: string
│   ├── imageUrl: string
│   ├── stock: number
│   ├── isActive: boolean
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

carts/
├── {userId}/
│   ├── items: array
│   │   └── {
│   │       productId: string,
│   │       quantity: number,
│   │       price: number,
│   │       addedAt: timestamp
│   │   }
│   ├── totalAmount: number
│   ├── discountCode: string
│   ├── discountAmount: number
│   └── updatedAt: timestamp

orders/
├── {orderId}/
│   ├── userId: string
│   ├── items: array
│   ├── totalAmount: number
│   ├── discountAmount: number
│   ├── paymentMethod: string
│   ├── paymentStatus: string
│   ├── orderStatus: string
│   ├── createdAt: timestamp
│   └── receipt: map
│       ├── receiptId: string
│       ├── receiptUrl: string
│       └── generatedAt: timestamp

discountCodes/
├── {codeId}/
│   ├── code: string
│   ├── discountType: string (percentage/fixed)
│   ├── discountValue: number
│   ├── minOrderAmount: number
│   ├── maxUses: number
│   ├── currentUses: number
│   ├── isActive: boolean
│   ├── validFrom: timestamp
│   └── validUntil: timestamp

analytics/
├── dailyStats/
│   └── {date}/
│       ├── totalOrders: number
│       ├── totalRevenue: number
│       ├── topProducts: array
│       └── userCount: number
```

## Security Rules

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products are readable by all authenticated users
    // Only admins can write
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Users can only access their own cart
    match /carts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read their own orders
    match /orders/{orderId} {
      allow read: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      allow update: if false; // Orders should not be updated after creation
    }
    
    // Discount codes are readable by authenticated users
    match /discountCodes/{codeId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Analytics are only accessible by admins
    match /analytics/{document=**} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // Admin collection
    match /admins/{adminId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
    }
  }
}
```

### Cloud Storage Security Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Product images
    match /products/{productId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    
    // User profile images
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Receipt files
    match /receipts/{orderId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions should write receipts
    }
  }
}
```

## Environment Configuration

### Firebase Configuration for Flutter
Create `lib/firebase_options.dart` with your Firebase configuration:

```dart
// This file is generated by the FlutterFire CLI
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'your-web-api-key',
    appId: 'your-web-app-id',
    messagingSenderId: 'your-sender-id',
    projectId: 'self-cart-app',
    authDomain: 'self-cart-app.firebaseapp.com',
    storageBucket: 'self-cart-app.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'your-android-api-key',
    appId: 'your-android-app-id',
    messagingSenderId: 'your-sender-id',
    projectId: 'self-cart-app',
    storageBucket: 'self-cart-app.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'your-ios-api-key',
    appId: 'your-ios-app-id',
    messagingSenderId: 'your-sender-id',
    projectId: 'self-cart-app',
    storageBucket: 'self-cart-app.appspot.com',
    iosBundleId: 'com.example.selfCartApp',
  );
}
```

## Initial Data Setup

### Sample Products Data
```json
{
  "products": [
    {
      "name": "Coca Cola 500ml",
      "description": "Refreshing cola drink",
      "price": 25.00,
      "category": "Beverages",
      "barcode": "8901030895566",
      "qrCode": "COKE_500ML_001",
      "imageUrl": "https://example.com/coke.jpg",
      "stock": 100,
      "isActive": true
    },
    {
      "name": "Lay's Classic Chips",
      "description": "Crispy potato chips",
      "price": 20.00,
      "category": "Snacks",
      "barcode": "8901030895567",
      "qrCode": "LAYS_CLASSIC_001",
      "imageUrl": "https://example.com/lays.jpg",
      "stock": 50,
      "isActive": true
    }
  ]
}
```

### Sample Discount Codes
```json
{
  "discountCodes": [
    {
      "code": "WELCOME10",
      "discountType": "percentage",
      "discountValue": 10,
      "minOrderAmount": 100,
      "maxUses": 1000,
      "currentUses": 0,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00Z",
      "validUntil": "2024-12-31T23:59:59Z"
    },
    {
      "code": "SAVE50",
      "discountType": "fixed",
      "discountValue": 50,
      "minOrderAmount": 200,
      "maxUses": 500,
      "currentUses": 0,
      "isActive": true,
      "validFrom": "2024-01-01T00:00:00Z",
      "validUntil": "2024-12-31T23:59:59Z"
    }
  ]
}
```

This Firebase configuration provides a solid foundation for the Self Cart App with proper security rules, data structure, and initial setup guidelines.

