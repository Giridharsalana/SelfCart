export interface Env {
  FIREBASE_PROJECT_ID: string
  FIREBASE_PRIVATE_KEY: string
  FIREBASE_CLIENT_EMAIL: string
  RAZORPAY_KEY_ID: string
  RAZORPAY_KEY_SECRET: string
  STRIPE_SECRET_KEY: string
  SMTP_HOST: string
  SMTP_PORT: string
  SMTP_USER: string
  SMTP_PASS: string
}

export interface OrderData {
  userId: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: string
  shippingAddress?: any
  createdAt?: Date
  status?: string
}

export interface OrderItem {
  productId: string
  quantity: number
  price: number
  name: string
}

export interface PaymentData {
  orderId: string
  amount: number
  currency?: string
  paymentMethod: string
  paymentDetails?: any
}

export interface UserData {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  phoneNumber?: string
  address?: any
  preferences?: any
}

export interface ProductData {
  id: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  imageUrl?: string
  barcode?: string
  createdAt?: Date
  updatedAt?: Date
}
