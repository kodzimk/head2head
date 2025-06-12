"use client"

import { useState } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs"
import { Textarea } from "../../shared/ui/textarea"
import { Switch } from "../../shared/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Badge } from "../../shared/ui/badge"
import { Separator } from "../../shared/ui/separator"
import { Alert, AlertDescription } from "../../shared/ui/alert"
import {
  User,
  Bell,
  Settings,
  Shield,
  LogOut,
  Upload,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  Facebook,
  Twitter,
  Instagram,
  Globe,
  Eye,
  EyeOff,
  Save,
} from "lucide-react"
import { Link } from "react-router-dom"


export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Mock user data
  const user = {
    name: "Alex Johnson",
    username: "sportsfan_alex",
    email: "alex@example.com",
    avatar: "/placeholder.svg?height=200&width=200",
    bio: "Sports enthusiast and trivia lover. I'm all about football, basketball, and baseball!",
    location: "New York, USA",
    phone: "+1 (555) 123-4567",
    dateJoined: "January 2023",
    favoritesSport: "Football",
    level: 42,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
        <Link href="/dashboard" className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl text-gray-900">head2head</span>
          </div>
        </Link>

        <div className="ml-6 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-2" />
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-orange-600">
            Back to Dashboard
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="bg-white">
            Level {user.level}
          </Badge>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>AJ</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:w-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden md:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden md:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden md:inline">Social</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                    <AvatarFallback>AJ</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="font-medium">Profile Picture</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload New
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Recommended: Square image, at least 300x300px</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Info Form */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue={user.username} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue={user.phone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" defaultValue={user.location} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favoriteSport">Favorite Sport</Label>
                    <Select defaultValue={user.favoritesSport}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a sport" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Football">Football</SelectItem>
                        <SelectItem value="Basketball">Basketball</SelectItem>
                        <SelectItem value="Baseball">Baseball</SelectItem>
                        <SelectItem value="Soccer">Soccer</SelectItem>
                        <SelectItem value="Hockey">Hockey</SelectItem>
                        <SelectItem value="Tennis">Tennis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" defaultValue={user.bio} rows={4} />
                    <p className="text-xs text-gray-500">Brief description for your profile. Maximum 200 characters.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Visibility</CardTitle>
                <CardDescription>Control what information is visible to other users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Online Status</Label>
                    <p className="text-sm text-gray-500">Allow others to see when you're online</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Battle History</Label>
                    <p className="text-sm text-gray-500">Make your battle history visible to others</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Stats & Achievements</Label>
                    <p className="text-sm text-gray-500">Display your stats and achievements on your profile</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Appear in Leaderboards</Label>
                    <p className="text-sm text-gray-500">Allow your name to appear in public leaderboards</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Privacy Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Preferences</CardTitle>
                <CardDescription>Manage your account settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Time Zone</Label>
                  <Select defaultValue="est">
                    <SelectTrigger>
                      <SelectValue placeholder="Select time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                      <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                      <SelectItem value="cst">Central Time (CT)</SelectItem>
                      <SelectItem value="est">Eastern Time (ET)</SelectItem>
                      <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                      <SelectItem value="cet">Central European Time (CET)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-gray-500">Switch between light and dark themes</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sound Effects</Label>
                    <p className="text-sm text-gray-500">Enable sound effects during battles</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animations</Label>
                    <p className="text-sm text-gray-500">Enable animations throughout the app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 pt-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-medium">Reset Account Statistics</h4>
                      <p className="text-sm text-gray-500">
                        Reset all your battle statistics, achievements, and history
                      </p>
                    </div>
                    <Button variant="outline" className="text-amber-600 border-amber-200">
                      Reset Statistics
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-medium">Deactivate Account</h4>
                      <p className="text-sm text-gray-500">
                        Temporarily disable your account. You can reactivate it anytime.
                      </p>
                    </div>
                    <Button variant="outline" className="text-amber-600 border-amber-200">
                      Deactivate
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with numbers and special characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Add an extra layer of security to your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">
                      Require a verification code when signing in from a new device
                    </p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Backup Recovery Codes</h4>
                  <p className="text-sm text-gray-500">
                    Generate backup codes to access your account if you lose your two-factor authentication device
                  </p>
                  <Button variant="outline" disabled>
                    Generate Backup Codes
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Login Sessions</CardTitle>
                <CardDescription>Manage your active sessions and devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Chrome on Windows</h4>
                      <p className="text-sm text-gray-500">New York, USA • Current Session</p>
                    </div>
                    <Badge>Current</Badge>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Safari on iPhone</h4>
                      <p className="text-sm text-gray-500">New York, USA • Last active: 2 hours ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Sign Out
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Chrome on MacBook</h4>
                      <p className="text-sm text-gray-500">Boston, USA • Last active: 3 days ago</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Sign Out
                    </Button>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out of All Devices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Control how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Email Notifications</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Battle Challenges</Label>
                      <p className="text-sm text-gray-500">Receive emails when someone challenges you</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tournament Updates</Label>
                      <p className="text-sm text-gray-500">Get notified about tournament starts and results</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Friend Requests</Label>
                      <p className="text-sm text-gray-500">Receive emails for new friend requests</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>News & Updates</Label>
                      <p className="text-sm text-gray-500">Get the latest news and feature updates</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Push Notifications</h3>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Battle Invites</Label>
                      <p className="text-sm text-gray-500">Get notified when someone invites you to battle</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Friend Activity</Label>
                      <p className="text-sm text-gray-500">Get updates when friends win tournaments or set records</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tournament Reminders</Label>
                      <p className="text-sm text-gray-500">Get reminded before tournaments you've joined</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Challenges</Label>
                      <p className="text-sm text-gray-500">Get notified about new daily challenges</p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold">Notification Schedule</h3>
                  <p className="text-sm text-gray-500">Set quiet hours when you don't want to receive notifications</p>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Quiet Hours Start</Label>
                      <Select defaultValue="22">
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">Quiet Hours End</Label>
                      <Select defaultValue="8">
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? "12 AM" : i === 12 ? "12 PM" : i < 12 ? `${i} AM` : `${i - 12} PM`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Notification Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your connected social accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Facebook className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Facebook</h4>
                      <p className="text-sm text-gray-500">Not Connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Twitter className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium">Twitter</h4>
                      <p className="text-sm text-gray-500">Connected as @sportsfan_alex</p>
                    </div>
                  </div>
                  <Button variant="outline">Disconnect</Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                      <Instagram className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">Instagram</h4>
                      <p className="text-sm text-gray-500">Not Connected</p>
                    </div>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Sharing</CardTitle>
                <CardDescription>Control what gets shared to your social accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Share Battle Victories</Label>
                    <p className="text-sm text-gray-500">Automatically share when you win battles</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Share Tournament Achievements</Label>
                    <p className="text-sm text-gray-500">Share when you win or place in tournaments</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Share New Achievements</Label>
                    <p className="text-sm text-gray-500">Share when you unlock new achievements</p>
                  </div>
                  <Switch />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Default Share Message</Label>
                  <Textarea
                    defaultValue="I just achieved [achievement] on Head2Head Sports Trivia! Can you beat my score? #Head2Head #SportsBattle"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500">
                    Use [achievement], [score], or [rank] to automatically insert those values
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button>Save Social Settings</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
