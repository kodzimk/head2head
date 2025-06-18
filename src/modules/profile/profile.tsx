"use client"

import { useState, useEffect, useContext } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs"
import { Switch } from "../../shared/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select"
import { Separator } from "../../shared/ui/separator"
import { Alert, AlertDescription } from "../../shared/ui/alert"
import {
  Settings,
  AlertTriangle,
  Save,
  Camera,
  Loader2,
  User,
} from "lucide-react"
import axios from "axios"

import { useNavigate } from "react-router-dom"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"
import { deleteUser, sendMessage } from "../../shared/websockets/websocket"
import { createWebSocket, newSocket } from "../../app/App"

export default function ProfileSettingsPage(  ) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("profile")
  const {user, setUser} = useGlobalStore()
  const [username, setUsername] = useState(user.username) 
  const [favourite, setFavourite] = useState<string>(user?.favoritesSport || 'Football')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });
  const [isLoading, setIsLoading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.favoritesSport) {
      setFavourite(user.favoritesSport)
    }
  }, [user?.favoritesSport])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleSave = async () => {
    const response = await axios.get(`http://localhost:8000/auth/username-user?username=${username}`)
    if (response.data === true && username !== user.username && username !== '') {
      setError("Username already exists")
      return
    }
    
    user.favoritesSport = favourite
    user.username = username
    setUser(user)
    setIsLoading(true)
    localStorage.setItem('username', username)
    sendMessage(user, "user_update")

    setTimeout(() => {
      
      setIsLoading(false)
    }, 500)
  }

  const handleReset = () => {
    user.wins = 0
    user.totalBattles = 0
    user.winRate = 0
    user.rank = 0
    user.streak = 0
    user.favoritesSport = 'Football'
    user.battles = []
    sendMessage(user, "user_update")
  }

const handleDelete = async () => {
   deleteUser(user)
   localStorage.removeItem("theme")
   localStorage.removeItem("user")
   navigate("/sign-up")  
}

const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  // Create preview
  const reader = new FileReader()
  reader.onloadend = () => {
    setAvatarPreview(reader.result as string)
  }
  reader.readAsDataURL(file)

  // Upload to backend
  try {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(
      `http://localhost:8000/db/upload-avatar?email=${encodeURIComponent(user.email)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    if (response.status === 200) {
      const updatedUser = { ...user, avatar: response.data.avatar_path }
      setUser(updatedUser)
    }
  } catch (error) {
    console.error('Error uploading avatar:', error)
    setError('Failed to upload avatar')
  } finally {
    setIsLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <Header user={user} />  

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
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
                    <div className="relative w-24 h-24">
                      <img
                        src={avatarPreview || (user.avatar ? `http://localhost:8000${user.avatar}` : "/placeholder.svg?height=100&width=100")}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
                      />
                    </div>
                    <button
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isLoading}
                      className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={isLoading}
                    />
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
                    <Input 
                      id="username" 
                      defaultValue={user.username} 
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (e.target.value.trim()) {
                          setError(null);
                        }
                      }} 
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-1">{error}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input disabled id="email" type="email" defaultValue={user.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favoriteSport">Favorite Sport</Label>
                    <Select 
                      value={favourite} 
                      onValueChange={(value) => {
                        setFavourite(value)
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a sport">
                          {favourite || "Select a sport"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Football">Football</SelectItem>
                        <SelectItem value="Basketball">Basketball</SelectItem>
                        <SelectItem value="Baseball">Baseball</SelectItem>
                        <SelectItem value="Tennis">Tennis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>

          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6 ">
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

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="dark:text-white">Dark Mode</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
                  </div>
                  <Switch 
                    checked={isDarkMode}
                    onCheckedChange={setIsDarkMode}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                <Separator />

              </CardContent>
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
                    <Button variant="outline" className="text-amber-600 border-amber-200" onClick={handleReset}>
                      Reset Statistics
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                    </div>
                    <Button variant="destructive" onClick={handleDelete}>Delete Account</Button>
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