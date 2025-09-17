# Self Cart App - Deployment Preparation

## Overview
This document provides a comprehensive checklist and configuration guide for deploying the Self Cart App to production environments.

## Pre-Deployment Checklist

### 1. Code Quality and Testing
- [ ] All unit tests passing (80%+ coverage)
- [ ] Integration tests passing (70%+ coverage)
- [ ] End-to-end tests passing (90%+ user journeys)
- [ ] Code review completed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Cross-platform testing completed
- [ ] Accessibility testing completed

### 2. Configuration Management
- [ ] Environment variables configured
- [ ] API keys and secrets secured
- [ ] Database connection strings updated
- [ ] Third-party service configurations verified
- [ ] SSL certificates obtained and configured
- [ ] Domain names configured
- [ ] CDN settings optimized

### 3. Security Preparation
- [ ] Firebase Security Rules reviewed and tested
- [ ] API rate limiting configured
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CORS policies configured
- [ ] Authentication flows tested
- [ ] Payment security verified (PCI compliance)

### 4. Performance Optimization
- [ ] Database queries optimized
- [ ] Images compressed and optimized
- [ ] Bundle sizes minimized
- [ ] Caching strategies implemented
- [ ] CDN configuration optimized
- [ ] Lazy loading implemented
- [ ] Memory leaks addressed

### 5. Monitoring and Logging
- [ ] Error tracking configured (Crashlytics, Sentry)
- [ ] Performance monitoring enabled
- [ ] Analytics tracking implemented
- [ ] Log aggregation configured
- [ ] Alerting rules defined
- [ ] Health check endpoints created

## Environment Configuration

### 1. Development Environment
```yaml
# .env.development
FIREBASE_PROJECT_ID=selfcart-dev
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=selfcart-dev.firebaseapp.com
FIREBASE_DATABASE_URL=https://selfcart-dev.firebaseio.com
FIREBASE_STORAGE_BUCKET=selfcart-dev.appspot.com

RAZORPAY_KEY_ID=rzp_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYPAL_CLIENT_ID=AY...

API_BASE_URL=http://localhost:3000
ADMIN_DASHBOARD_URL=http://localhost:3001
```

### 2. Staging Environment
```yaml
# .env.staging
FIREBASE_PROJECT_ID=selfcart-staging
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=selfcart-staging.firebaseapp.com
FIREBASE_DATABASE_URL=https://selfcart-staging.firebaseio.com
FIREBASE_STORAGE_BUCKET=selfcart-staging.appspot.com

RAZORPAY_KEY_ID=rzp_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYPAL_CLIENT_ID=AY...

API_BASE_URL=https://api-staging.selfcart.com
ADMIN_DASHBOARD_URL=https://admin-staging.selfcart.com
```

### 3. Production Environment
```yaml
# .env.production
FIREBASE_PROJECT_ID=selfcart-prod
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=selfcart.firebaseapp.com
FIREBASE_DATABASE_URL=https://selfcart.firebaseio.com
FIREBASE_STORAGE_BUCKET=selfcart.appspot.com

RAZORPAY_KEY_ID=rzp_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=AY...

API_BASE_URL=https://api.selfcart.com
ADMIN_DASHBOARD_URL=https://admin.selfcart.com
```

## Firebase Configuration

### 1. Firebase Projects Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase projects
firebase projects:create selfcart-dev
firebase projects:create selfcart-staging
firebase projects:create selfcart-prod

# Set up project aliases
firebase use --add selfcart-dev --alias development
firebase use --add selfcart-staging --alias staging
firebase use --add selfcart-prod --alias production
```

### 2. Firestore Configuration
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products are readable by all authenticated users
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Orders are readable by owner and admins
    match /orders/{orderId} {
      allow read, write: if request.auth != null && 
        (resource.data.userId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // Admin-only collections
    match /analytics/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

### 3. Firebase Storage Rules
```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Product images - readable by all, writable by admins
    match /products/{productId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // User profile images - readable and writable by owner
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Receipts - readable by owner and admins
    match /receipts/{userId}/{allPaths=**} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
  }
}
```

### 4. Firebase Hosting Configuration
```json
{
  "hosting": [
    {
      "target": "admin",
      "public": "admin-dashboard/build",
      "ignore": [
        "firebase.json",
        "**/.*",
        "**/node_modules/**"
      ],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "**/*.@(js|css)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        },
        {
          "source": "**/*.@(png|jpg|jpeg|gif|webp|svg)",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "max-age=31536000"
            }
          ]
        }
      ]
    }
  ]
}
```

## Mobile App Deployment

### 1. Android Deployment (Google Play Store)

#### Build Configuration
```gradle
// android/app/build.gradle
android {
    compileSdkVersion 33
    
    defaultConfig {
        applicationId "com.selfcart.app"
        minSdkVersion 21
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Key Store Setup
```bash
# Generate keystore
keytool -genkey -v -keystore ~/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload

# Create key.properties
echo "storePassword=your_store_password" > android/key.properties
echo "keyPassword=your_key_password" >> android/key.properties
echo "keyAlias=upload" >> android/key.properties
echo "storeFile=../upload-keystore.jks" >> android/key.properties
```

#### Build Commands
```bash
# Clean and build
flutter clean
flutter pub get

# Build release APK
flutter build apk --release --shrink

# Build App Bundle (recommended for Play Store)
flutter build appbundle --release
```

### 2. iOS Deployment (App Store)

#### Xcode Configuration
```xml
<!-- ios/Runner/Info.plist -->
<dict>
    <key>CFBundleDisplayName</key>
    <string>Self Cart</string>
    <key>CFBundleIdentifier</key>
    <string>com.selfcart.app</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    
    <!-- Camera permission -->
    <key>NSCameraUsageDescription</key>
    <string>This app needs camera access to scan product barcodes</string>
    
    <!-- Location permission (if needed) -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app needs location access to find nearby stores</string>
</dict>
```

#### Build Commands
```bash
# Clean and build
flutter clean
flutter pub get

# Build iOS
flutter build ios --release

# Archive in Xcode
# 1. Open ios/Runner.xcworkspace in Xcode
# 2. Select "Any iOS Device" as target
# 3. Product > Archive
# 4. Upload to App Store Connect
```

## Cloud Functions Deployment

### 1. Function Configuration
```json
{
  "functions": {
    "runtime": "nodejs18",
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

### 2. Environment Variables
```bash
# Set Firebase Functions config
firebase functions:config:set \
  stripe.secret_key="sk_live_..." \
  stripe.webhook_secret="whsec_..." \
  razorpay.key_id="rzp_live_..." \
  razorpay.key_secret="..." \
  email.user="noreply@selfcart.com" \
  email.password="..." \
  email.from="Self Cart <noreply@selfcart.com>"
```

### 3. Deployment Commands
```bash
# Deploy to staging
firebase use staging
firebase deploy --only functions

# Deploy to production
firebase use production
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:processOrder
```

## Admin Dashboard Deployment

### 1. Build Configuration
```json
{
  "name": "self-cart-admin",
  "version": "1.0.0",
  "scripts": {
    "build": "react-scripts build",
    "build:staging": "REACT_APP_ENV=staging npm run build",
    "build:production": "REACT_APP_ENV=production npm run build"
  }
}
```

### 2. Environment Configuration
```javascript
// src/config/environment.js
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    firebaseConfig: {
      // Development config
    }
  },
  staging: {
    apiUrl: 'https://api-staging.selfcart.com',
    firebaseConfig: {
      // Staging config
    }
  },
  production: {
    apiUrl: 'https://api.selfcart.com',
    firebaseConfig: {
      // Production config
    }
  }
};

export default config[process.env.REACT_APP_ENV || 'development'];
```

### 3. Deployment Commands
```bash
# Build for staging
npm run build:staging

# Deploy to Firebase Hosting
firebase use staging
firebase deploy --only hosting:admin

# Build and deploy to production
npm run build:production
firebase use production
firebase deploy --only hosting:admin
```

## Database Migration and Seeding

### 1. Initial Data Setup
```typescript
// scripts/seed-database.ts
import * as admin from 'firebase-admin';

const seedData = async () => {
  const db = admin.firestore();
  
  // Seed categories
  const categories = ['Electronics', 'Groceries', 'Clothing', 'Books'];
  for (const category of categories) {
    await db.collection('categories').add({
      name: category,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  // Seed admin user
  const adminUser = await admin.auth().createUser({
    email: 'admin@selfcart.com',
    password: 'SecurePassword123!',
    displayName: 'Admin User'
  });
  
  await db.collection('users').doc(adminUser.uid).set({
    email: 'admin@selfcart.com',
    displayName: 'Admin User',
    isAdmin: true,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('Database seeded successfully');
};

seedData().catch(console.error);
```

### 2. Data Migration Scripts
```typescript
// scripts/migrate-data.ts
const migrateUserData = async () => {
  const db = admin.firestore();
  const batch = db.batch();
  
  const usersSnapshot = await db.collection('users').get();
  
  usersSnapshot.docs.forEach(doc => {
    const userData = doc.data();
    
    // Add new fields
    batch.update(doc.ref, {
      loyaltyPoints: userData.loyaltyPoints || 0,
      totalOrders: userData.totalOrders || 0,
      totalSpent: userData.totalSpent || 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log('User data migration completed');
};
```

## Monitoring and Alerting Setup

### 1. Firebase Performance Monitoring
```dart
// Enable performance monitoring
await FirebasePerformance.instance.setPerformanceCollectionEnabled(true);

// Custom traces
final trace = FirebasePerformance.instance.newTrace('checkout_process');
await trace.start();
// ... checkout logic
await trace.stop();
```

### 2. Error Tracking
```dart
// Crashlytics setup
FlutterError.onError = (errorDetails) {
  FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
};

// Custom error logging
try {
  // risky operation
} catch (error, stackTrace) {
  await FirebaseCrashlytics.instance.recordError(
    error,
    stackTrace,
    reason: 'Payment processing failed'
  );
}
```

### 3. Analytics Setup
```dart
// Firebase Analytics
await FirebaseAnalytics.instance.logEvent(
  name: 'product_scanned',
  parameters: {
    'product_id': productId,
    'category': category,
    'price': price,
  },
);
```

## SSL Certificate Configuration

### 1. Domain Setup
```bash
# Configure custom domain in Firebase Hosting
firebase hosting:channel:deploy production --expires 30d

# Add custom domain
# 1. Go to Firebase Console > Hosting
# 2. Add custom domain
# 3. Verify domain ownership
# 4. SSL certificate will be auto-provisioned
```

### 2. API SSL Configuration
```nginx
# nginx configuration for API endpoints
server {
    listen 443 ssl http2;
    server_name api.selfcart.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup and Recovery

### 1. Database Backup
```bash
# Firestore backup
gcloud firestore export gs://selfcart-backups/$(date +%Y-%m-%d)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y-%m-%d)
gcloud firestore export gs://selfcart-backups/$DATE
echo "Backup completed for $DATE"
```

### 2. Recovery Procedures
```bash
# Restore from backup
gcloud firestore import gs://selfcart-backups/2023-12-01

# Point-in-time recovery (if enabled)
gcloud firestore databases restore \
    --source-backup=projects/selfcart-prod/databases/(default)/backups/backup-id \
    --destination-database=restored-database
```

## Go-Live Checklist

### Final Pre-Launch Verification
- [ ] All environments tested and verified
- [ ] SSL certificates installed and working
- [ ] DNS records configured correctly
- [ ] Payment gateways tested with real transactions
- [ ] Email notifications working
- [ ] Push notifications configured
- [ ] App store listings prepared
- [ ] Privacy policy and terms of service published
- [ ] GDPR compliance verified (if applicable)
- [ ] Backup and recovery procedures tested
- [ ] Monitoring and alerting configured
- [ ] Support documentation prepared
- [ ] Team trained on production procedures

### Launch Day Tasks
- [ ] Deploy to production
- [ ] Verify all services are running
- [ ] Test critical user journeys
- [ ] Monitor error rates and performance
- [ ] Announce launch to stakeholders
- [ ] Monitor user feedback and support channels

### Post-Launch Monitoring
- [ ] Monitor application performance
- [ ] Track user adoption metrics
- [ ] Monitor error rates and crashes
- [ ] Review security logs
- [ ] Collect user feedback
- [ ] Plan first update/patch release

## Rollback Procedures

### Emergency Rollback
```bash
# Rollback Cloud Functions
firebase functions:delete functionName
firebase deploy --only functions

# Rollback Hosting
firebase hosting:channel:deploy previous-version

# Rollback mobile app
# 1. Prepare hotfix release
# 2. Submit to app stores with expedited review
# 3. Communicate with users about the update
```

This deployment preparation guide ensures a smooth and successful launch of the Self Cart App across all platforms and environments.

