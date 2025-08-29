import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Eye, 
  Download,
  Calendar,
  ShoppingCart,
  User,
  CreditCard
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Mock data
const orders = [
  {
    id: 'ORD-001',
    customer: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+91 9876543210'
    },
    items: [
      { name: 'Coca Cola 500ml', quantity: 2, price: 25.00 },
      { name: 'Lay\'s Classic Chips', quantity: 1, price: 20.00 }
    ],
    totalAmount: 70.00,
    discountAmount: 0.00,
    paymentMethod: 'UPI',
    paymentStatus: 'Completed',
    orderStatus: 'Delivered',
    createdAt: '2024-01-15T10:30:00Z',
    deliveredAt: '2024-01-15T14:30:00Z'
  },
  {
    id: 'ORD-002',
    customer: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+91 9876543211'
    },
    items: [
      { name: 'Bread Loaf', quantity: 1, price: 30.00 },
      { name: 'Milk 1L', quantity: 2, price: 45.00 }
    ],
    totalAmount: 120.00,
    discountAmount: 12.00,
    paymentMethod: 'Card',
    paymentStatus: 'Completed',
    orderStatus: 'Processing',
    createdAt: '2024-01-15T11:15:00Z'
  },
  {
    id: 'ORD-003',
    customer: {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      phone: '+91 9876543212'
    },
    items: [
      { name: 'Rice 5kg', quantity: 1, price: 250.00 }
    ],
    totalAmount: 250.00,
    discountAmount: 25.00,
    paymentMethod: 'PayPal',
    paymentStatus: 'Pending',
    orderStatus: 'Pending',
    createdAt: '2024-01-15T12:00:00Z'
  }
]

const orderStatuses = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
const paymentStatuses = ['All', 'Pending', 'Completed', 'Failed', 'Refunded']

export function OrderManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('All')
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('All')

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesOrderStatus = selectedOrderStatus === 'All' || order.orderStatus === selectedOrderStatus
    const matchesPaymentStatus = selectedPaymentStatus === 'All' || order.paymentStatus === selectedPaymentStatus
    return matchesSearch && matchesOrderStatus && matchesPaymentStatus
  })

  const getStatusBadge = (status, type) => {
    const statusConfig = {
      orderStatus: {
        'Pending': 'secondary',
        'Processing': 'default',
        'Shipped': 'default',
        'Delivered': 'default',
        'Cancelled': 'destructive'
      },
      paymentStatus: {
        'Pending': 'secondary',
        'Completed': 'default',
        'Failed': 'destructive',
        'Refunded': 'secondary'
      }
    }
    
    return (
      <Badge variant={statusConfig[type][status] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const OrderDetailsDialog = ({ order }) => (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Order Details - {order.id}</DialogTitle>
        <DialogDescription>
          Complete order information and customer details
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
              <p className="font-medium">{order.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="font-medium">{order.customer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
              <p className="font-medium">{order.customer.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Order Date</p>
              <p className="font-medium">{formatDate(order.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Order Items</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>₹{item.price.toFixed(2)}</TableCell>
                    <TableCell>₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{(order.totalAmount + order.discountAmount).toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-₹{order.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg border-t pt-2">
              <span>Total:</span>
              <span>₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Method:</span>
                  <span>{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(order.paymentStatus, 'paymentStatus')}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Order Status</h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(order.orderStatus, 'orderStatus')}
                </div>
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span>Delivered:</span>
                    <span className="text-sm">{formatDate(order.deliveredAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Download Receipt
          </Button>
          <Select defaultValue={order.orderStatus}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orderStatuses.slice(1).map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>Update Status</Button>
        </div>
      </div>
    </DialogContent>
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Track and manage customer orders</p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Orders
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Orders</p>
                <p className="text-2xl font-bold">23</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payments</p>
                <p className="text-2xl font-bold">5</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Customers</p>
                <p className="text-2xl font-bold">456</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders by ID, customer name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedOrderStatus} onValueChange={setSelectedOrderStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderStatuses.map((status) => (
                  <SelectItem key={status} value={status}>Order: {status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status}>Payment: {status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} order(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{order.items.length} item(s)</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {order.items[0].name}{order.items.length > 1 && ` +${order.items.length - 1} more`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">₹{order.totalAmount.toFixed(2)}</p>
                      {order.discountAmount > 0 && (
                        <p className="text-sm text-green-600">-₹{order.discountAmount.toFixed(2)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{order.paymentMethod}</p>
                      {getStatusBadge(order.paymentStatus, 'paymentStatus')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.orderStatus, 'orderStatus')}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </DialogTrigger>
                      <OrderDetailsDialog order={order} />
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || selectedOrderStatus !== 'All' || selectedPaymentStatus !== 'All'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Orders will appear here once customers start placing them'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

