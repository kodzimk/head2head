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
  Settings,
  LogOut,
  Upload,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  Save,
  Camera,
} from "lucide-react"
import { Link } from "react-router-dom"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../shared/ui/dropdown-menu"
import { Play, List, Trophy, BookOpen, Users, UserIcon, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
export default function ProfileSettingsPage(  ) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("profile")

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
    rank: "#1247",
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
        <div className="ml-2 flex items-center">
          <ChevronLeft className="w-4 h-4" />
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-orange-600">
            Back to Dashboard
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4 sm:hidden block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full hover:bg-slate-100"
            >
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarImage
                  src={user.avatar || "/placeholder.svg"}
                  alt={user.username}
                />
                <AvatarFallback>AJ</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900">
                  {user.username}
                </p>
                <p className="text-xs leading-none text-slate-500">
                  {user.rank}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Mobile Navigation Links */}
            <div className="md:hidden">
            <Link to="/battle">
                <DropdownMenuItem className="cursor-pointer">
                  <Play className="mr-2 h-4 w-4" />
                  <span>Battle</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/selection">
                <DropdownMenuItem className="cursor-pointer">
                  <List className="mr-2 h-4 w-4" />
                  <span>Selection</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/leaderboard">
                <DropdownMenuItem className="cursor-pointer">
                  <Trophy className="mr-2 h-4 w-4" />
                  <span>Leaderboard</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/trainings">
                <DropdownMenuItem className="cursor-pointer">
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Trainings</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/friend">
                <DropdownMenuItem className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Friends</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
            </div>
            

            <Link to="/profile">
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Manage Profile</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              onClick={() => navigate("/sign-in")}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-2 lg:w-auto">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Account</span>
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
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>AJ</AvatarFallback>
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="w-4 h-4 text-gray-600" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          // Handle file upload here
                          const file = e.target.files?.[0];
                          if (file) {
                            // Add your file upload logic here
                            console.log('Selected file:', file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Profile Picture</h3>
                    <p className="text-xs text-gray-500">Click the camera icon to upload a new profile picture. Recommended: Square image, at least 300x300px</p>
                  </div>
                </div>

                <Separator />

                {/* Basic Info Form */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue={user.username} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input disabled id="email" type="email" defaultValue={user.email} />
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
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
