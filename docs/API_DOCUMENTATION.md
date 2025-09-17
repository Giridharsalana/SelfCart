# Self Cart App - API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Base URLs and Environments](#base-urls-and-environments)
4. [Request/Response Format](#requestresponse-format)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [User Management APIs](#user-management-apis)
8. [Product Management APIs](#product-management-apis)
9. [Cart Management APIs](#cart-management-apis)
10. [Order Management APIs](#order-management-apis)
11. [Payment APIs](#payment-apis)
12. [Analytics APIs](#analytics-apis)
13. [Notification APIs](#notification-apis)
14. [Admin APIs](#admin-apis)
15. [Webhooks](#webhooks)
16. [SDK and Code Examples](#sdk-and-code-examples)

## Introduction

The Self Cart App API provides a comprehensive set of endpoints for managing all aspects of the self-service shopping experience. Built on Firebase Cloud Functions, the API offers secure, scalable, and real-time functionality for mobile applications and admin dashboards.

### API Features
- **RESTful Design**: Standard HTTP methods and status codes
- **Real-time Updates**: Firebase Firestore real-time listeners
- **Secure Authentication**: Firebase Authentication integration
- **Role-based Access**: User and admin permission levels
- **Payment Integration**: Multiple payment gateway support
- **Comprehensive Analytics**: Business intelligence and reporting
- **Webhook Support**: Real-time event notifications

### API Architecture
The API follows a microservices architecture with separate function groups for different business domains:
- **User Services**: Authentication, profiles, preferences
- **Product Services**: Catalog management, inventory tracking
- **Order Services**: Cart management, checkout processing
- **Payment Services**: Transaction processing, refunds
- **Analytics Services**: Reporting, business intelligence
- **Notification Services**: Email, SMS, push notifications

## Authentication

All API endpoints require authentication using Firebase Authentication tokens. The API supports multiple authentication methods including email/password, Google Sign-In, and custom tokens.

### Authentication Flow
1. **Client Authentication**: Users authenticate through Firebase Auth
2. **Token Generation**: Firebase generates JWT tokens
3. **API Requests**: Include token in Authorization header
4. **Token Validation**: Cloud Functions validate tokens
5. **User Context**: Extract user information from validated tokens

### Authentication Headers
```http
Authorization: Bearer <firebase-auth-token>
Content-Type: application/json
```

### Token Validation
```javascript
// Example token validation in Cloud Functions
import * as admin from 'firebase-admin';

const validateAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Role-based Access Control
The API implements role-based access control with the following roles:
- **Customer**: Standard user with shopping capabilities
- **Admin**: Administrative user with management capabilities
- **Super Admin**: Full system access and configuration

```javascript
// Example role checking
const requireAdmin = async (req, res, next) => {
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(req.user.uid)
    .get();
  
  if (!userDoc.exists || !userDoc.data().isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};
```

## Base URLs and Environments

The API is deployed across multiple environments with different base URLs:

### Development Environment
```
Base URL: https://us-central1-selfcart-dev.cloudfunctions.net/api
Dashboard: https://selfcart-dev.web.app
```

### Staging Environment
```
Base URL: https://us-central1-selfcart-staging.cloudfunctions.net/api
Dashboard: https://admin-staging.selfcart.com
```

### Production Environment
```
Base URL: https://us-central1-selfcart-prod.cloudfunctions.net/api
Dashboard: https://admin.selfcart.com
```

### Regional Endpoints
For optimal performance, the API may be deployed to multiple regions:
- **US Central**: `us-central1-{project}.cloudfunctions.net`
- **Europe West**: `europe-west1-{project}.cloudfunctions.net`
- **Asia Southeast**: `asia-southeast1-{project}.cloudfunctions.net`

## Request/Response Format

### Request Format
All API requests should use JSON format with appropriate Content-Type headers:

```http
POST /api/orders
Content-Type: application/json
Authorization: Bearer <token>

{
  "items": [
    {
      "productId": "prod_123",
      "quantity": 2,
      "price": 25.99
    }
  ],
  "discountCode": "SAVE10"
}
```

### Response Format
All API responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "totalAmount": 46.78,
    "status": "pending"
  },
  "message": "Order created successfully",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Error Response Format
Error responses include detailed error information:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Product not found",
    "details": {
      "productId": "prod_123",
      "field": "items[0].productId"
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Pagination Format
List endpoints support pagination with consistent parameters:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Error Handling

### HTTP Status Codes
The API uses standard HTTP status codes:

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Temporary service issue |

### Error Codes
Custom error codes provide specific error identification:

| Code | Description | HTTP Status |
|------|-------------|-------------|
| INVALID_INPUT | Invalid request data | 400 |
| MISSING_REQUIRED_FIELD | Required field missing | 400 |
| INVALID_TOKEN | Authentication token invalid | 401 |
| TOKEN_EXPIRED | Authentication token expired | 401 |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions | 403 |
| RESOURCE_NOT_FOUND | Requested resource not found | 404 |
| DUPLICATE_RESOURCE | Resource already exists | 409 |
| VALIDATION_ERROR | Data validation failed | 422 |
| RATE_LIMIT_EXCEEDED | Too many requests | 429 |
| PAYMENT_FAILED | Payment processing failed | 422 |
| INSUFFICIENT_STOCK | Product out of stock | 422 |
| INTERNAL_ERROR | Server-side error | 500 |

### Error Response Examples

**Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Invalid email format"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters"
        }
      ]
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Resource Not Found**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Product not found",
    "details": {
      "resourceType": "product",
      "resourceId": "prod_123"
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and prevent abuse:

### Rate Limit Headers
All responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1638360000
X-RateLimit-Window: 3600
```

### Rate Limit Tiers
Different endpoints have different rate limits:

| Endpoint Category | Requests per Hour | Burst Limit |
|------------------|-------------------|-------------|
| Authentication | 100 | 10 |
| Product Catalog | 1000 | 50 |
| Cart Operations | 500 | 25 |
| Order Processing | 200 | 10 |
| Payment Operations | 100 | 5 |
| Admin Operations | 2000 | 100 |

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 1000,
      "window": 3600,
      "resetTime": "2023-12-01T11:00:00Z"
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

## User Management APIs

### Get User Profile
Retrieve the authenticated user's profile information.

**Endpoint:** `GET /api/users/profile`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "user_123",
    "email": "user@example.com",
    "displayName": "John Doe",
    "photoURL": "https://example.com/photo.jpg",
    "phone": "+1234567890",
    "isActive": true,
    "isAdmin": false,
    "totalOrders": 15,
    "totalSpent": 1250.75,
    "loyaltyPoints": 125,
    "notificationPreferences": {
      "emailNotifications": true,
      "pushNotifications": true,
      "smsNotifications": false
    },
    "createdAt": "2023-01-15T08:30:00Z",
    "updatedAt": "2023-12-01T10:30:00Z"
  }
}
```

### Update User Profile
Update the authenticated user's profile information.

**Endpoint:** `PUT /api/users/profile`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "displayName": "John Smith",
  "phone": "+1234567890",
  "notificationPreferences": {
    "emailNotifications": true,
    "pushNotifications": false,
    "smsNotifications": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uid": "user_123",
    "displayName": "John Smith",
    "phone": "+1234567890",
    "updatedAt": "2023-12-01T10:35:00Z"
  },
  "message": "Profile updated successfully"
}
```

### Get User Order History
Retrieve the authenticated user's order history with pagination.

**Endpoint:** `GET /api/users/orders`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by order status
- `startDate` (optional): Filter orders from date (ISO 8601)
- `endDate` (optional): Filter orders to date (ISO 8601)

**Example Request:**
```http
GET /api/users/orders?page=1&limit=10&status=completed
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_456",
        "orderNumber": "SC-2023-001234",
        "status": "completed",
        "totalAmount": 89.97,
        "itemCount": 3,
        "paymentMethod": "razorpay",
        "paymentStatus": "completed",
        "createdAt": "2023-11-28T14:20:00Z",
        "items": [
          {
            "productId": "prod_123",
            "productName": "Wireless Headphones",
            "quantity": 1,
            "price": 59.99,
            "totalPrice": 59.99
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Update FCM Token
Update the user's Firebase Cloud Messaging token for push notifications.

**Endpoint:** `POST /api/users/fcm-token`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fcmToken": "dGhpcyBpcyBhIGZha2UgdG9rZW4="
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token updated successfully"
}
```

### Get Loyalty Points History
Retrieve the user's loyalty points transaction history.

**Endpoint:** `GET /api/users/loyalty-points`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentBalance": 125,
    "transactions": [
      {
        "id": "txn_789",
        "type": "earned",
        "points": 25,
        "reason": "Order completion",
        "orderId": "order_456",
        "createdAt": "2023-11-28T14:25:00Z"
      },
      {
        "id": "txn_790",
        "type": "redeemed",
        "points": -50,
        "reason": "Discount redemption",
        "orderId": "order_457",
        "createdAt": "2023-11-30T09:15:00Z"
      }
    ]
  }
}
```

## Product Management APIs

### Get Products
Retrieve a list of products with filtering, sorting, and pagination.

**Endpoint:** `GET /api/products`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Filter by category
- `search` (optional): Search in product names and descriptions
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `inStock` (optional): Filter in-stock products (true/false)
- `sortBy` (optional): Sort field (name, price, createdAt)
- `sortOrder` (optional): Sort order (asc, desc)

**Example Request:**
```http
GET /api/products?category=Electronics&inStock=true&sortBy=price&sortOrder=asc&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Wireless Bluetooth Headphones",
        "description": "High-quality wireless headphones with noise cancellation",
        "price": 59.99,
        "category": "Electronics",
        "categoryId": "cat_456",
        "barcode": "1234567890123",
        "imageUrl": "https://storage.googleapis.com/selfcart/products/prod_123.jpg",
        "stock": 25,
        "lowStockThreshold": 10,
        "isActive": true,
        "isOutOfStock": false,
        "rating": 4.5,
        "reviewCount": 128,
        "tags": ["wireless", "bluetooth", "audio"],
        "specifications": {
          "brand": "TechBrand",
          "model": "TB-WH-001",
          "color": "Black",
          "weight": "250g"
        },
        "createdAt": "2023-10-15T09:00:00Z",
        "updatedAt": "2023-11-28T16:45:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    },
    "filters": {
      "categories": [
        {
          "id": "cat_456",
          "name": "Electronics",
          "count": 45
        }
      ],
      "priceRange": {
        "min": 5.99,
        "max": 299.99
      }
    }
  }
}
```

### Get Product by ID
Retrieve detailed information about a specific product.

**Endpoint:** `GET /api/products/{productId}`

**Path Parameters:**
- `productId`: Product identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Wireless Bluetooth Headphones",
    "description": "High-quality wireless headphones with active noise cancellation technology. Perfect for music lovers and professionals who need crystal-clear audio quality.",
    "price": 59.99,
    "originalPrice": 79.99,
    "discount": 25,
    "category": "Electronics",
    "categoryId": "cat_456",
    "barcode": "1234567890123",
    "images": [
      {
        "url": "https://storage.googleapis.com/selfcart/products/prod_123_1.jpg",
        "alt": "Front view"
      },
      {
        "url": "https://storage.googleapis.com/selfcart/products/prod_123_2.jpg",
        "alt": "Side view"
      }
    ],
    "stock": 25,
    "lowStockThreshold": 10,
    "isActive": true,
    "isOutOfStock": false,
    "rating": 4.5,
    "reviewCount": 128,
    "tags": ["wireless", "bluetooth", "audio", "noise-cancellation"],
    "specifications": {
      "brand": "TechBrand",
      "model": "TB-WH-001",
      "color": "Black",
      "weight": "250g",
      "batteryLife": "30 hours",
      "connectivity": "Bluetooth 5.0",
      "warranty": "2 years"
    },
    "features": [
      "Active Noise Cancellation",
      "30-hour battery life",
      "Quick charge (5 min = 2 hours playback)",
      "Premium comfort design"
    ],
    "relatedProducts": [
      {
        "id": "prod_124",
        "name": "Wireless Earbuds",
        "price": 39.99,
        "imageUrl": "https://storage.googleapis.com/selfcart/products/prod_124.jpg"
      }
    ],
    "createdAt": "2023-10-15T09:00:00Z",
    "updatedAt": "2023-11-28T16:45:00Z"
  }
}
```

### Search Products by Barcode
Search for a product using its barcode.

**Endpoint:** `GET /api/products/barcode/{barcode}`

**Path Parameters:**
- `barcode`: Product barcode

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_123",
    "name": "Wireless Bluetooth Headphones",
    "price": 59.99,
    "barcode": "1234567890123",
    "imageUrl": "https://storage.googleapis.com/selfcart/products/prod_123.jpg",
    "stock": 25,
    "isActive": true,
    "isOutOfStock": false
  }
}
```

### Get Product Categories
Retrieve all product categories.

**Endpoint:** `GET /api/products/categories`

**Response:**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat_456",
        "name": "Electronics",
        "description": "Electronic devices and accessories",
        "imageUrl": "https://storage.googleapis.com/selfcart/categories/electronics.jpg",
        "productCount": 45,
        "isActive": true,
        "sortOrder": 1
      },
      {
        "id": "cat_457",
        "name": "Groceries",
        "description": "Food and household items",
        "imageUrl": "https://storage.googleapis.com/selfcart/categories/groceries.jpg",
        "productCount": 120,
        "isActive": true,
        "sortOrder": 2
      }
    ]
  }
}
```

### Create Product (Admin Only)
Create a new product in the catalog.

**Endpoint:** `POST /api/products`

**Headers:**
```http
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Smart Fitness Watch",
  "description": "Advanced fitness tracking with heart rate monitoring",
  "price": 149.99,
  "categoryId": "cat_456",
  "barcode": "9876543210987",
  "stock": 50,
  "lowStockThreshold": 10,
  "specifications": {
    "brand": "FitTech",
    "model": "FT-SW-001",
    "color": "Black",
    "batteryLife": "7 days"
  },
  "tags": ["fitness", "smartwatch", "health"],
  "features": [
    "Heart rate monitoring",
    "GPS tracking",
    "Water resistant",
    "Sleep tracking"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_789",
    "name": "Smart Fitness Watch",
    "price": 149.99,
    "barcode": "9876543210987",
    "createdAt": "2023-12-01T10:30:00Z"
  },
  "message": "Product created successfully"
}
```

### Update Product (Admin Only)
Update an existing product.

**Endpoint:** `PUT /api/products/{productId}`

**Headers:**
```http
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "price": 139.99,
  "stock": 75,
  "description": "Advanced fitness tracking with heart rate monitoring and GPS"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prod_789",
    "price": 139.99,
    "stock": 75,
    "updatedAt": "2023-12-01T10:35:00Z"
  },
  "message": "Product updated successfully"
}
```

### Delete Product (Admin Only)
Soft delete a product (marks as inactive).

**Endpoint:** `DELETE /api/products/{productId}`

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

## Cart Management APIs

### Get Cart
Retrieve the current user's cart contents.

**Endpoint:** `GET /api/cart`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cart_123",
    "userId": "user_456",
    "items": [
      {
        "id": "item_789",
        "productId": "prod_123",
        "productName": "Wireless Bluetooth Headphones",
        "productImage": "https://storage.googleapis.com/selfcart/products/prod_123.jpg",
        "price": 59.99,
        "quantity": 2,
        "totalPrice": 119.98,
        "addedAt": "2023-12-01T09:15:00Z"
      }
    ],
    "itemCount": 2,
    "subtotal": 119.98,
    "tax": 9.60,
    "discount": 0,
    "total": 129.58,
    "updatedAt": "2023-12-01T09:15:00Z"
  }
}
```

### Add Item to Cart
Add a product to the user's cart.

**Endpoint:** `POST /api/cart/items`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "prod_123",
  "quantity": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "item_789",
    "productId": "prod_123",
    "quantity": 2,
    "totalPrice": 119.98,
    "cartTotal": 129.58
  },
  "message": "Item added to cart successfully"
}
```

### Update Cart Item
Update the quantity of an item in the cart.

**Endpoint:** `PUT /api/cart/items/{itemId}`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "itemId": "item_789",
    "quantity": 3,
    "totalPrice": 179.97,
    "cartTotal": 189.57
  },
  "message": "Cart item updated successfully"
}
```

### Remove Item from Cart
Remove an item from the cart.

**Endpoint:** `DELETE /api/cart/items/{itemId}`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cartTotal": 0,
    "itemCount": 0
  },
  "message": "Item removed from cart successfully"
}
```

### Clear Cart
Remove all items from the cart.

**Endpoint:** `DELETE /api/cart`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cart cleared successfully"
}
```

### Apply Discount Code
Apply a discount code to the cart.

**Endpoint:** `POST /api/cart/discount`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "discountCode": "SAVE10"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "discountCode": "SAVE10",
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 11.99,
    "subtotal": 119.98,
    "discount": 11.99,
    "tax": 8.64,
    "total": 116.63
  },
  "message": "Discount code applied successfully"
}
```

### Remove Discount Code
Remove the applied discount code from the cart.

**Endpoint:** `DELETE /api/cart/discount`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtotal": 119.98,
    "discount": 0,
    "tax": 9.60,
    "total": 129.58
  },
  "message": "Discount code removed successfully"
}
```

## Order Management APIs

### Create Order
Create a new order from the current cart contents.

**Endpoint:** `POST /api/orders`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentMethod": "razorpay",
  "deliveryAddress": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  },
  "notes": "Please handle with care"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "orderNumber": "SC-2023-001234",
    "status": "pending",
    "paymentStatus": "pending",
    "totalAmount": 129.58,
    "items": [
      {
        "productId": "prod_123",
        "productName": "Wireless Bluetooth Headphones",
        "quantity": 2,
        "price": 59.99,
        "totalPrice": 119.98
      }
    ],
    "paymentDetails": {
      "method": "razorpay",
      "razorpayOrderId": "order_razorpay_123"
    },
    "createdAt": "2023-12-01T10:30:00Z"
  },
  "message": "Order created successfully"
}
```

### Get Order Details
Retrieve detailed information about a specific order.

**Endpoint:** `GET /api/orders/{orderId}`

**Headers:**
```http
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "order_456",
    "orderNumber": "SC-2023-001234",
    "userId": "user_123",
    "status": "completed",
    "paymentStatus": "completed",
    "paymentMethod": "razorpay",
    "totalAmount": 129.58,
    "subtotal": 119.98,
    "tax": 9.60,
    "discount": 0,
    "items": [
      {
        "productId": "prod_123",
        "productName": "Wireless Bluetooth Headphones",
        "productImage": "https://storage.googleapis.com/selfcart/products/prod_123.jpg",
        "quantity": 2,
        "price": 59.99,
        "totalPrice": 119.98
      }
    ],
    "deliveryAddress": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400001",
      "country": "India"
    },
    "paymentDetails": {
      "method": "razorpay",
      "transactionId": "pay_razorpay_456",
      "paidAt": "2023-12-01T10:35:00Z"
    },
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2023-12-01T10:30:00Z",
        "note": "Order created"
      },
      {
        "status": "paid",
        "timestamp": "2023-12-01T10:35:00Z",
        "note": "Payment completed"
      },
      {
        "status": "completed",
        "timestamp": "2023-12-01T10:40:00Z",
        "note": "Order ready for pickup"
      }
    ],
    "receiptUrl": "https://storage.googleapis.com/selfcart/receipts/order_456.pdf",
    "createdAt": "2023-12-01T10:30:00Z",
    "updatedAt": "2023-12-01T10:40:00Z"
  }
}
```

### Update Order Status (Admin Only)
Update the status of an order.

**Endpoint:** `PUT /api/orders/{orderId}/status`

**Headers:**
```http
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "processing",
  "note": "Order is being prepared"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "status": "processing",
    "updatedAt": "2023-12-01T11:00:00Z"
  },
  "message": "Order status updated successfully"
}
```

### Cancel Order
Cancel an order (only allowed for pending orders).

**Endpoint:** `POST /api/orders/{orderId}/cancel`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Changed mind"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "status": "cancelled",
    "refundStatus": "pending",
    "cancelledAt": "2023-12-01T11:15:00Z"
  },
  "message": "Order cancelled successfully"
}
```

### Get Orders (Admin Only)
Retrieve all orders with filtering and pagination.

**Endpoint:** `GET /api/orders`

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by order status
- `paymentStatus` (optional): Filter by payment status
- `startDate` (optional): Filter orders from date
- `endDate` (optional): Filter orders to date
- `userId` (optional): Filter by user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_456",
        "orderNumber": "SC-2023-001234",
        "userId": "user_123",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "status": "completed",
        "paymentStatus": "completed",
        "totalAmount": 129.58,
        "itemCount": 2,
        "createdAt": "2023-12-01T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25,
      "hasNext": true,
      "hasPrevious": false
    },
    "summary": {
      "totalOrders": 500,
      "totalRevenue": 25000.00,
      "averageOrderValue": 50.00,
      "statusBreakdown": {
        "pending": 25,
        "processing": 50,
        "completed": 400,
        "cancelled": 25
      }
    }
  }
}
```

## Payment APIs

### Create Payment Intent
Create a payment intent for order processing.

**Endpoint:** `POST /api/payments/intent`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order_456",
  "paymentMethod": "stripe",
  "currency": "inr"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentIntentId": "pi_stripe_123",
    "clientSecret": "pi_stripe_123_secret_456",
    "amount": 12958,
    "currency": "inr",
    "status": "requires_payment_method"
  }
}
```

### Create Razorpay Order
Create a Razorpay order for payment processing.

**Endpoint:** `POST /api/payments/razorpay/order`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order_456",
  "amount": 129.58,
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_razorpay_123",
    "amount": 12958,
    "currency": "INR",
    "status": "created",
    "keyId": "rzp_live_123456"
  }
}
```

### Verify Payment
Verify payment completion and update order status.

**Endpoint:** `POST /api/payments/verify`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Razorpay):**
```json
{
  "paymentId": "pay_razorpay_456",
  "orderId": "order_razorpay_123",
  "signature": "signature_hash_789",
  "gateway": "razorpay"
}
```

**Request Body (Stripe):**
```json
{
  "paymentIntentId": "pi_stripe_123",
  "gateway": "stripe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_456",
    "paymentStatus": "completed",
    "transactionId": "pay_razorpay_456",
    "paidAmount": 129.58,
    "paidAt": "2023-12-01T10:35:00Z"
  },
  "message": "Payment verified successfully"
}
```

### Process Refund (Admin Only)
Process a refund for a completed order.

**Endpoint:** `POST /api/payments/refund`

**Headers:**
```http
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "order_456",
  "amount": 129.58,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "refundId": "rfnd_123",
    "orderId": "order_456",
    "amount": 129.58,
    "status": "processed",
    "processedAt": "2023-12-01T12:00:00Z"
  },
  "message": "Refund processed successfully"
}
```

### Get Payment History (Admin Only)
Retrieve payment transaction history.

**Endpoint:** `GET /api/payments/history`

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `gateway` (optional): Filter by payment gateway
- `status` (optional): Filter by payment status
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "payment_123",
        "orderId": "order_456",
        "gateway": "razorpay",
        "transactionId": "pay_razorpay_456",
        "amount": 129.58,
        "currency": "INR",
        "status": "completed",
        "method": "card",
        "createdAt": "2023-12-01T10:35:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    },
    "summary": {
      "totalTransactions": 1000,
      "totalAmount": 50000.00,
      "successRate": 95.5,
      "gatewayBreakdown": {
        "razorpay": 600,
        "stripe": 300,
        "paypal": 100
      }
    }
  }
}
```

---

*This API documentation provides comprehensive information for integrating with the Self Cart App backend services. For additional support or questions, please contact the development team.*

