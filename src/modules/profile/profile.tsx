"use client"

import { useContext, useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs"
import { Switch } from "../../shared/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Separator } from "../../shared/ui/separator"
import { Alert, AlertDescription } from "../../shared/ui/alert"
import {
  Settings,
  LogOut,
  AlertTriangle,
  ChevronLeft,
  Save,
  Camera,
} from "lucide-react"
import { Link } from "react-router-dom"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../../shared/ui/dropdown-menu"
import { Play, List, Trophy, BookOpen, Users, UserIcon, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useGlobalStore, useThemeStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"


export default function ProfileSettingsPage(  ) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("profile")
  const {user, setUser} = useGlobalStore()
  const [username, setUsername] = useState(user.username) 
  const [favourite, setFavourite] = useState(user.favoritesSport)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleSave = () => {
    user.username = username
    user.favoritesSport = favourite
    setUser(user)

    const response = axios.post("http://127.0.0.1:8000/db/update-user", {
      username: user.username,
      email: user.email,
      favourite: user.favoritesSport,
      winBattle: user.wins,
      totalBattle: user.totalBattles,
      winRate: user.winRate,
      ranking: user.rank,
      streak: user.streak,
      password: user.password,
    })

  }

  const handleReset = () => {
    user.wins = 0
    user.totalBattles = 0
    user.winRate = 0
    user.rank = 0
    user.streak = 0
    setUser(user)
    const response = axios.post("http://127.0.0.1:8000/db/update-user", {
      username: user.username,
      email: user.email,
      favourite: user.favoritesSport,
      winBattle: user.wins,
      totalBattle: user.totalBattles,
      winRate: user.winRate,
      ranking: user.rank,
      streak: user.streak,
      password: user.password,
    })
  
  }

const handleDelete = async () => {
  try {
    console.log('Attempting to delete user:', user.email);
    const url = `http://localhost:8000/db/delete-user?email=${encodeURIComponent(user.email)}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    

    const data = await response.text();
  
    
    if (response.ok) {
      localStorage.removeItem("theme");
      localStorage.removeItem("user");
      navigate("/sign-up");
    }
  } catch (error) {

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
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.username} />
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
                    <Input id="username" defaultValue={user.username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input disabled id="email" type="email" defaultValue={user.email} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="favoriteSport">Favorite Sport</Label>
                    <Select defaultValue={favourite} onValueChange={(value) => setFavourite(value)}>
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
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
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
