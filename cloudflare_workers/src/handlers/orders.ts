import { initializeFirebase, verifyFirebaseToken, getCorsHeaders } from '../utils/firebase'
import { createSuccessResponse, createErrorResponse, handleCors } from '../utils/response'
import type { Env, OrderData } from '../types'

export async function handleOrders(request: Request, env: Env): Promise<Response> {
  const corsHeaders = getCorsHeaders()
  const corsResponse = handleCors(request, corsHeaders)
  if (corsResponse) return corsResponse

  try {
    const { firestore, auth } = await initializeFirebase(env)
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401, corsHeaders)
    }

    const token = authHeader.replace('Bearer ', '')
    const decodedToken = await verifyFirebaseToken(token, auth)

    const method = request.method
    const url = new URL(request.url)

    switch (method) {
      case 'POST':
        return await createOrder(request, firestore, decodedToken, corsHeaders)
      case 'GET':
        return await getOrders(request, firestore, decodedToken, corsHeaders)
      case 'PUT':
        return await updateOrder(request, firestore, decodedToken, corsHeaders)
      default:
        return createErrorResponse('Method not allowed', 405, corsHeaders)
    }
  } catch (error: any) {
    console.error('Orders handler error:', error)
    return createErrorResponse(error.message || 'Internal server error', 500, corsHeaders)
  }
}

async function createOrder(request: Request, firestore: any, user: any, headers: any): Promise<Response> {
  try {
    const orderData: OrderData = await request.json()
    
    // Validate order data
    if (!orderData.items || orderData.items.length === 0) {
      return createErrorResponse('Order must contain items', 400, headers)
    }

    if (!orderData.totalAmount || orderData.totalAmount <= 0) {
      return createErrorResponse('Invalid total amount', 400, headers)
    }

    // Create order in Firestore
    const orderRef = await firestore.collection('orders').add({
      ...orderData,
      userId: user.uid,
      createdAt: new Date(),
      status: 'pending',
      updatedAt: new Date()
    })

    // Process order (replaces onOrderCreated trigger)
    await processOrder(orderRef.id, { ...orderData, userId: user.uid }, firestore)

    return createSuccessResponse({ 
      orderId: orderRef.id, 
      status: 'created' 
    }, headers)
  } catch (error: any) {
    console.error('Create order error:', error)
    return createErrorResponse('Failed to create order', 500, headers)
  }
}

async function processOrder(orderId: string, orderData: OrderData, firestore: any) {
  try {
    // Update user's order history
    await firestore.collection('users').doc(orderData.userId).update({
      lastOrderId: orderId,
      lastOrderAt: new Date(),
      totalOrders: firestore.FieldValue.increment(1),
      totalSpent: firestore.FieldValue.increment(orderData.totalAmount)
    })

    // Update product stock
    const batch = firestore.batch()
    for (const item of orderData.items) {
      const productRef = firestore.collection('products').doc(item.productId)
      batch.update(productRef, {
        stock: firestore.FieldValue.increment(-item.quantity),
        totalSales: firestore.FieldValue.increment(item.quantity)
      })
    }
    await batch.commit()

    // Create notification
    await firestore.collection('notifications').add({
      type: 'order_confirmation',
      userId: orderData.userId,
      orderId: orderId,
      createdAt: new Date(),
      read: false
    })

    console.log(`Order ${orderId} processed successfully`)
  } catch (error) {
    console.error(`Error processing order ${orderId}:`, error)
  }
}

async function getOrders(request: Request, firestore: any, user: any, headers: any): Promise<Response> {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const ordersSnapshot = await firestore
      .collection('orders')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get()

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return createSuccessResponse({ orders }, headers)
  } catch (error: any) {
    console.error('Get orders error:', error)
    return createErrorResponse('Failed to fetch orders', 500, headers)
  }
}

async function updateOrder(request: Request, firestore: any, user: any, headers: any): Promise<Response> {
  try {
    const url = new URL(request.url)
    const orderId = url.pathname.split('/').pop()
    
    if (!orderId) {
      return createErrorResponse('Order ID required', 400, headers)
    }

    const updateData = await request.json()
    
    // Verify order belongs to user
    const orderDoc = await firestore.collection('orders').doc(orderId).get()
    if (!orderDoc.exists) {
      return createErrorResponse('Order not found', 404, headers)
    }

    const orderData = orderDoc.data()
    if (orderData.userId !== user.uid) {
      return createErrorResponse('Unauthorized', 403, headers)
    }

    // Update order
    await firestore.collection('orders').doc(orderId).update({
      ...updateData,
      updatedAt: new Date()
    })

    return createSuccessResponse({ message: 'Order updated successfully' }, headers)
  } catch (error: any) {
    console.error('Update order error:', error)
    return createErrorResponse('Failed to update order', 500, headers)
  }
}
