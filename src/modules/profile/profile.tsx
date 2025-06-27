import { useState, useEffect } from "react"
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
  RefreshCw,
  Trophy,
  Target,
  Zap,
  Trash2,
} from "lucide-react"
import axios from "axios"

import { useNavigate } from "react-router-dom"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"
import { deleteUser, sendMessage } from "../../shared/websockets/websocket"
import { initializeWebSocketForNewUser } from "../../app/App"
import { API_BASE_URL } from "../../shared/interface/gloabL_var"

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [nickname, setNickname] = useState(user.nickname || "");
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [showResetSection, setShowResetSection] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetType, setResetType] = useState('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

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
    // Clear previous messages
    setError(null)
    setSuccessMessage(null)
    
    // Validate username
    if (!username.trim()) {
      setError("Username cannot be empty")
      return
    }
    
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long")
      return
    }
    
    const response = await axios.get(`${API_BASE_URL}/auth/username-user?username=${username}`)
    if (response.data === true && username !== user.username && username !== '') {
      setError("Username already exists")
      return
    }
    
    const oldUsername = user.username
    user.favoritesSport = favourite;
    user.nickname = nickname;
    user.username = username;
    setUser(user)
    setIsLoading(true)
    localStorage.setItem('username', username)
    sendMessage(user, "user_update")

    // If username changed, reinitialize websocket connection and navigate
    if (oldUsername !== username) {
      console.log("Username changed, reinitializing websocket connection");
      console.log("Old username:", oldUsername);
      console.log("New username:", username);
      setSuccessMessage(`Username successfully changed from "${oldUsername}" to "${username}"!`);
      
      // Add a small delay to ensure backend has processed the update
      setTimeout(() => {
        initializeWebSocketForNewUser(username);
      }, 500);
      
      // Don't redirect - let user stay on the same page
    } else {
      setSuccessMessage("Profile updated successfully!");
    }

    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }

  const handleResetStats = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }

    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/db/reset-user-stats?username=${user.username}&reset_type=${resetType}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data) {
        setMessage(`Statistics reset successfully! ${response.data.message}`)
        setMessageType('success')
        
        // Update the user object with reset stats
        const updatedUser = {
          ...user,
          totalBattles: response.data.new_stats.totalBattle,
          wins: response.data.new_stats.winBattle,
          winRate: response.data.new_stats.winRate,
          streak: response.data.new_stats.streak,
          rank: response.data.new_stats.ranking,
          battles: []
        }
        
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        // Reset confirmation state
        setShowResetConfirm(false)
        setShowResetSection(false)
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setMessage('')
        }, 5000)
      }
    } catch (error: any) {
      console.error('Error resetting statistics:', error)
      setMessage(error.response?.data?.detail || 'Failed to reset statistics')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const getResetTypeDescription = (type: string) => {
    switch (type) {
      case 'all':
        return 'Reset all battle statistics, ranking, and streak'
      case 'battles':
        return 'Reset only battle-related statistics (wins, total battles, win rate, streak)'
      case 'ranking':
        return 'Reset only ranking position'
      case 'streak':
        return 'Reset only current winning streak'
      default:
        return ''
    }
  }

  const getResetTypeIcon = (type: string) => {
    switch (type) {
      case 'all':
        return <Trash2 className="w-4 h-4" />
      case 'battles':
        return <Target className="w-4 h-4" />
      case 'ranking':
        return <Trophy className="w-4 h-4" />
      case 'streak':
        return <Zap className="w-4 h-4" />
      default:
        return <RefreshCw className="w-4 h-4" />
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    
    if (deleteConfirmText !== 'DELETE') {
      setMessage('Please type "DELETE" to confirm account deletion')
      setMessageType('error')
      return
    }
    
    deleteUser()
    localStorage.removeItem("theme")
    localStorage.removeItem("username")
    localStorage.removeItem("access_token")
    navigate("/sign-up")  
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      setIsLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(
        `${API_BASE_URL}/db/upload-avatar?token=${localStorage.getItem("access_token")?.replace(/"/g, '')}`,
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
      setError('Failed to upload avatar')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
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

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal details and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  <div className="relative">
                    <div className="relative w-24 h-24">
                      <img
                        src={avatarPreview || (user.avatar ? `https://api.head2head.dev${user.avatar}` : "/placeholder.svg?height=100&width=100")}
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
                          setSuccessMessage(null);
                        }
                      }} 
                    />
                    {error && (
                      <p className="text-sm text-red-500 mt-1">{error}</p>
                    )}
                    {successMessage && (
                      <p className="text-sm text-green-500 mt-1">{successMessage}</p>
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
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      placeholder="Enter your nickname"
                    />
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
                    <Button variant="outline" className="text-amber-600 border-amber-200" onClick={() => setShowResetSection(true)}>
                      Reset Statistics
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : showDeleteConfirm ? (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Confirm Delete
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {message && (
          <Alert className={`mt-6 ${messageType === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : messageType === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}`}>
            <AlertDescription className={messageType === 'error' ? 'text-red-700 dark:text-red-300' : messageType === 'warning' ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {showResetSection && (
          <Card className="mt-6 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="w-5 h-5" />
                Reset Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                    Warning: This action will permanently reset your statistics and cannot be undone.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="resetType">Reset Type</Label>
                  <Select value={resetType} onValueChange={setResetType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reset type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          {getResetTypeIcon('all')}
                          <span>All Statistics</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="battles">
                        <div className="flex items-center gap-2">
                          {getResetTypeIcon('battles')}
                          <span>Battle Statistics</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ranking">
                        <div className="flex items-center gap-2">
                          {getResetTypeIcon('ranking')}
                          <span>Ranking Only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="streak">
                        <div className="flex items-center gap-2">
                          {getResetTypeIcon('streak')}
                          <span>Streak Only</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-2">
                    {getResetTypeDescription(resetType)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleResetStats}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : showResetConfirm ? (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Confirm Reset
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Statistics
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResetSection(false)
                      setShowResetConfirm(false)
                      setResetType('all')
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showDeleteConfirm && (
          <Card className="mt-6 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5" />
                Delete Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> This action will permanently delete your account and all associated data. This cannot be undone.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="deleteConfirm">Type "DELETE" to confirm</Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="border-red-300 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-500">
                    This will permanently remove your account, all battle history, friends, and achievements.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading || deleteConfirmText !== 'DELETE'}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Confirm Delete
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                      setMessage('')
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}