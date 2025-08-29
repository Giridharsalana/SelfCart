import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Save, 
  Store, 
  CreditCard, 
  Bell, 
  Shield,
  Mail,
  Smartphone,
  Globe
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export function Settings() {
  const [settings, setSettings] = useState({
    // Store Settings
    storeName: 'Self Cart Store',
    storeDescription: 'Your convenient self-service shopping experience',
    storeAddress: '123 Main Street, City, State 12345',
    storePhone: '+91 9876543210',
    storeEmail: 'store@selfcart.com',
    storeWebsite: 'https://selfcart.com',
    
    // Payment Settings
    razorpayEnabled: true,
    razorpayKeyId: 'rzp_test_1DP5mmOlF5G5ag',
    stripeEnabled: true,
    stripePublishableKey: 'pk_test_...',
    paypalEnabled: true,
    paypalClientId: 'AY...',
    upiEnabled: true,
    upiMerchantId: 'selfcart@paytm',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderNotifications: true,
    lowStockNotifications: true,
    paymentNotifications: true,
    
    // Security Settings
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    
    // App Settings
    allowGuestCheckout: true,
    requirePhoneVerification: false,
    autoApproveOrders: false,
    defaultCurrency: 'INR',
    defaultLanguage: 'en',
    taxRate: '18',
    
    // Inventory Settings
    lowStockThreshold: '10',
    autoReorderEnabled: false,
    autoReorderQuantity: '50'
  })

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = () => {
    console.log('Saving settings:', settings)
    // Here you would typically save to your backend
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your store configuration and preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Store className="mr-2 h-5 w-5" />
            Store Information
          </CardTitle>
          <CardDescription>Basic information about your store</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeName">Store Name</Label>
              <Input
                id="storeName"
                value={settings.storeName}
                onChange={(e) => handleSettingChange('storeName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="storeEmail">Store Email</Label>
              <Input
                id="storeEmail"
                type="email"
                value={settings.storeEmail}
                onChange={(e) => handleSettingChange('storeEmail', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="storeDescription">Store Description</Label>
            <Textarea
              id="storeDescription"
              value={settings.storeDescription}
              onChange={(e) => handleSettingChange('storeDescription', e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storePhone">Phone Number</Label>
              <Input
                id="storePhone"
                value={settings.storePhone}
                onChange={(e) => handleSettingChange('storePhone', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="storeWebsite">Website</Label>
              <Input
                id="storeWebsite"
                value={settings.storeWebsite}
                onChange={(e) => handleSettingChange('storeWebsite', e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="storeAddress">Store Address</Label>
            <Textarea
              id="storeAddress"
              value={settings.storeAddress}
              onChange={(e) => handleSettingChange('storeAddress', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>Configure payment gateways and methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Razorpay */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Razorpay</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accept cards, UPI, and other payment methods</p>
              </div>
              <Switch
                checked={settings.razorpayEnabled}
                onCheckedChange={(checked) => handleSettingChange('razorpayEnabled', checked)}
              />
            </div>
            {settings.razorpayEnabled && (
              <div className="ml-4 space-y-2">
                <div>
                  <Label htmlFor="razorpayKeyId">Key ID</Label>
                  <Input
                    id="razorpayKeyId"
                    value={settings.razorpayKeyId}
                    onChange={(e) => handleSettingChange('razorpayKeyId', e.target.value)}
                    placeholder="rzp_test_..."
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Stripe */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Stripe</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">International payment processing</p>
              </div>
              <Switch
                checked={settings.stripeEnabled}
                onCheckedChange={(checked) => handleSettingChange('stripeEnabled', checked)}
              />
            </div>
            {settings.stripeEnabled && (
              <div className="ml-4 space-y-2">
                <div>
                  <Label htmlFor="stripePublishableKey">Publishable Key</Label>
                  <Input
                    id="stripePublishableKey"
                    value={settings.stripePublishableKey}
                    onChange={(e) => handleSettingChange('stripePublishableKey', e.target.value)}
                    placeholder="pk_test_..."
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* PayPal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">PayPal</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Accept PayPal payments</p>
              </div>
              <Switch
                checked={settings.paypalEnabled}
                onCheckedChange={(checked) => handleSettingChange('paypalEnabled', checked)}
              />
            </div>
            {settings.paypalEnabled && (
              <div className="ml-4 space-y-2">
                <div>
                  <Label htmlFor="paypalClientId">Client ID</Label>
                  <Input
                    id="paypalClientId"
                    value={settings.paypalClientId}
                    onChange={(e) => handleSettingChange('paypalClientId', e.target.value)}
                    placeholder="AY..."
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* UPI */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">UPI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unified Payments Interface</p>
              </div>
              <Switch
                checked={settings.upiEnabled}
                onCheckedChange={(checked) => handleSettingChange('upiEnabled', checked)}
              />
            </div>
            {settings.upiEnabled && (
              <div className="ml-4 space-y-2">
                <div>
                  <Label htmlFor="upiMerchantId">Merchant UPI ID</Label>
                  <Input
                    id="upiMerchantId"
                    value={settings.upiMerchantId}
                    onChange={(e) => handleSettingChange('upiMerchantId', e.target.value)}
                    placeholder="merchant@paytm"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Notification Channels</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Notifications</span>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>SMS Notifications</span>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Push Notifications</span>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Notification Types</h4>
              
              <div className="flex items-center justify-between">
                <span>New Orders</span>
                <Switch
                  checked={settings.orderNotifications}
                  onCheckedChange={(checked) => handleSettingChange('orderNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Low Stock Alerts</span>
                <Switch
                  checked={settings.lowStockNotifications}
                  onCheckedChange={(checked) => handleSettingChange('lowStockNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Payment Updates</span>
                <Switch
                  checked={settings.paymentNotifications}
                  onCheckedChange={(checked) => handleSettingChange('paymentNotifications', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Manage security and access controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Two-Factor Authentication</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => handleSettingChange('twoFactorAuth', checked)}
                />
              </div>
              
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Select value={settings.sessionTimeout} onValueChange={(value) => handleSettingChange('sessionTimeout', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                <Select value={settings.passwordExpiry} onValueChange={(value) => handleSettingChange('passwordExpiry', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="mr-2 h-5 w-5" />
            App Settings
          </CardTitle>
          <CardDescription>General application configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Allow Guest Checkout</span>
                <Switch
                  checked={settings.allowGuestCheckout}
                  onCheckedChange={(checked) => handleSettingChange('allowGuestCheckout', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Require Phone Verification</span>
                <Switch
                  checked={settings.requirePhoneVerification}
                  onCheckedChange={(checked) => handleSettingChange('requirePhoneVerification', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span>Auto-approve Orders</span>
                <Switch
                  checked={settings.autoApproveOrders}
                  onCheckedChange={(checked) => handleSettingChange('autoApproveOrders', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Select value={settings.defaultCurrency} onValueChange={(value) => handleSettingChange('defaultCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Select value={settings.defaultLanguage} onValueChange={(value) => handleSettingChange('defaultLanguage', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => handleSettingChange('taxRate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Settings</CardTitle>
          <CardDescription>Configure inventory management options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => handleSettingChange('lowStockThreshold', e.target.value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Auto-reorder</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Automatically reorder when stock is low</p>
                </div>
                <Switch
                  checked={settings.autoReorderEnabled}
                  onCheckedChange={(checked) => handleSettingChange('autoReorderEnabled', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {settings.autoReorderEnabled && (
                <div>
                  <Label htmlFor="autoReorderQuantity">Auto-reorder Quantity</Label>
                  <Input
                    id="autoReorderQuantity"
                    type="number"
                    value={settings.autoReorderQuantity}
                    onChange={(e) => handleSettingChange('autoReorderQuantity', e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

