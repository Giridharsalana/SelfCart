# Self Cart App

## Project Overview

This project aims to develop a comprehensive Self Cart application using Flutter for cross-platform mobile development (Android and iOS) and Flutter Web for the admin dashboard. The application will allow users to scan products, view details, manage a virtual cart, and checkout using various payment gateways. A robust Firebase backend will handle data storage, authentication, and business logic.

## Technology Stack

### Frontend (Mobile & Admin Dashboard)
- **Flutter**: Cross-platform UI toolkit for building natively compiled applications for mobile, web, and desktop from a single codebase.
- **Dart**: Programming language used by Flutter.

### Backend
- **Firebase Firestore**: NoSQL cloud database for real-time data synchronization and storage of product details, user profiles, cart data, and past purchases.
- **Firebase Authentication**: Secure user authentication with support for email/password, Google, and social logins.
- **Firebase Cloud Storage**: Cloud storage for product images and other media files.
- **Firebase Cloud Functions**: Serverless functions to handle backend business logic, such as checkout processes, payment verification, and inventory updates.

### Payment Gateways
- **UPI**: For Indian payment methods.
- **Stripe**: For card payments and general online transactions.
- **PayPal**: For international payment options.

### Barcode/QR Scanning
- **`mobile_scanner` or `barcode_scan2` (Flutter packages)**: For efficient barcode and QR code scanning using the device camera.

## Architectural Considerations

### Modularity and Scalability
- **Layered Architecture**: Separate concerns into distinct layers (e.g., UI, BLoC/Provider/Riverpod for state management, Repository, Data Source) to ensure modularity and testability.
- **Service-Oriented Design**: Utilize Firebase services for specific functionalities (Auth, Firestore, Storage, Functions) to leverage their scalability and managed infrastructure.
- **Clean Code Principles**: Adhere to SOLID principles and design patterns to maintain a clean, readable, and maintainable codebase.

### Real-time Data Synchronization
- Leverage Firestore's real-time capabilities for instant updates to product availability, cart contents, and total price.

### Security
- **Firebase Security Rules**: Implement strict security rules for Firestore and Cloud Storage to control data access and prevent unauthorized operations.
- **Firebase Authentication**: Secure user authentication and authorization.
- **Cloud Functions for Sensitive Operations**: Handle all sensitive business logic (e.g., payment processing, inventory updates) within Firebase Cloud Functions to prevent client-side manipulation.

### User Experience (UI/UX)
- **Clean, Minimal, and Modern Design**: Focus on intuitive navigation and a visually appealing interface.
- **Responsive Design**: Ensure the application adapts seamlessly to various screen sizes and orientations on both mobile and web.

### Admin Dashboard
- **Product Management**: CRUD operations for product catalog and inventory.
- **Analytics**: Display key metrics such as sales data, popular products, and inventory levels.

## Project Structure (Initial)

```
self_cart_app/
├── lib/
│   ├── main.dart
│   ├── models/
│   ├── services/
│   ├── providers/ (or bloc/cubit/riverpod)
│   ├── ui/
│   │   ├── screens/
│   │   ├── widgets/
│   ├── utils/
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   ├── functions/
│   │   ├── index.js (or index.ts)
├── admin_dashboard/
│   ├── lib/
│   ├── pubspec.yaml
├── assets/
│   ├── images/
│   ├── icons/
├── pubspec.yaml
├── README.md
├── .gitignore
```


