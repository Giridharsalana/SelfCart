import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Percent,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
const discountCodes = [
  {
    id: '1',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 100,
    maxUses: 1000,
    currentUses: 245,
    isActive: true,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    description: 'Welcome discount for new users'
  },
  {
    id: '2',
    code: 'SAVE50',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 200,
    maxUses: 500,
    currentUses: 123,
    isActive: true,
    validFrom: '2024-01-01',
    validUntil: '2024-06-30',
    description: 'Fixed discount for orders above ₹200'
  },
  {
    id: '3',
    code: 'EXPIRED20',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 150,
    maxUses: 100,
    currentUses: 100,
    isActive: false,
    validFrom: '2023-12-01',
    validUntil: '2023-12-31',
    description: 'Holiday season discount (expired)'
  }
]

export function DiscountManagement() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)

  const filteredDiscounts = discountCodes.filter(discount =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    discount.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isExpired = (validUntil) => {
    return new Date(validUntil) < new Date()
  }

  const isUsageLimitReached = (currentUses, maxUses) => {
    return currentUses >= maxUses
  }

  const getStatusBadge = (discount) => {
    if (!discount.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    if (isExpired(discount.validUntil)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    if (isUsageLimitReached(discount.currentUses, discount.maxUses)) {
      return <Badge variant="destructive">Usage Limit Reached</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  const DiscountForm = ({ discount, onSave, onCancel }) => {
    const [formData, setFormData] = useState(discount || {
      code: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderAmount: '',
      maxUses: '',
      validFrom: '',
      validUntil: '',
      description: '',
      isActive: true
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      onSave(formData)
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="code">Discount Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
              placeholder="SAVE20"
              required
            />
          </div>
          <div>
            <Label htmlFor="discountType">Discount Type</Label>
            <Select value={formData.discountType} onValueChange={(value) => setFormData({...formData, discountType: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountValue">
              Discount Value {formData.discountType === 'percentage' ? '(%)' : '(₹)'}
            </Label>
            <Input
              id="discountValue"
              type="number"
              step={formData.discountType === 'percentage' ? '1' : '0.01'}
              value={formData.discountValue}
              onChange={(e) => setFormData({...formData, discountValue: parseFloat(e.target.value)})}
              required
            />
          </div>
          <div>
            <Label htmlFor="minOrderAmount">Minimum Order Amount (₹)</Label>
            <Input
              id="minOrderAmount"
              type="number"
              step="0.01"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({...formData, minOrderAmount: parseFloat(e.target.value)})}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="maxUses">Maximum Uses</Label>
          <Input
            id="maxUses"
            type="number"
            value={formData.maxUses}
            onChange={(e) => setFormData({...formData, maxUses: parseInt(e.target.value)})}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="validFrom">Valid From</Label>
            <Input
              id="validFrom"
              type="date"
              value={formData.validFrom}
              onChange={(e) => setFormData({...formData, validFrom: e.target.value})}
              required
            />
          </div>
          <div>
            <Label htmlFor="validUntil">Valid Until</Label>
            <Input
              id="validUntil"
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
              required
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Brief description of the discount"
          />
        </div>
        
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {discount ? 'Update Discount' : 'Create Discount'}
          </Button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Discount Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage discount codes for your store</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Discount Code</DialogTitle>
              <DialogDescription>
                Set up a new discount code for your customers
              </DialogDescription>
            </DialogHeader>
            <DiscountForm
              onSave={(data) => {
                console.log('Creating discount:', data)
                setIsAddDialogOpen(false)
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Discounts</p>
                <p className="text-2xl font-bold">{discountCodes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Discounts</p>
                <p className="text-2xl font-bold">
                  {discountCodes.filter(d => d.isActive && !isExpired(d.validUntil) && !isUsageLimitReached(d.currentUses, d.maxUses)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Uses</p>
                <p className="text-2xl font-bold">
                  {discountCodes.reduce((sum, d) => sum + d.currentUses, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Est. Savings</p>
                <p className="text-2xl font-bold">₹12,450</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search discount codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Codes</CardTitle>
          <CardDescription>
            {filteredDiscounts.length} discount code(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDiscounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{discount.code}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{discount.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {discount.discountType === 'percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {discount.discountType === 'percentage' 
                        ? `${discount.discountValue}%` 
                        : `₹${discount.discountValue}`
                      }
                    </span>
                  </TableCell>
                  <TableCell>₹{discount.minOrderAmount}</TableCell>
                  <TableCell>
                    <div>
                      <p>{discount.currentUses} / {discount.maxUses}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(discount.currentUses / discount.maxUses) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(discount.validFrom)}</p>
                      <p className="text-gray-600 dark:text-gray-400">to {formatDate(discount.validUntil)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(discount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingDiscount(discount)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Edit Discount Code</DialogTitle>
                            <DialogDescription>
                              Update discount code settings
                            </DialogDescription>
                          </DialogHeader>
                          <DiscountForm
                            discount={editingDiscount}
                            onSave={(data) => {
                              console.log('Updating discount:', data)
                              setEditingDiscount(null)
                            }}
                            onCancel={() => setEditingDiscount(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredDiscounts.length === 0 && (
            <div className="py-12 text-center">
              <Percent className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No discount codes found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first discount code to attract customers'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

