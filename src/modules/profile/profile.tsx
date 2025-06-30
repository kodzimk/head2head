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
import { AvatarUpload } from "../../shared/ui/avatar-upload"
import AvatarStorage from "../../shared/utils/avatar-storage"

export default function ProfileSettingsPage(  ) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("profile")
  const {user, setUser} = useGlobalStore()
  const [username, setUsername] = useState(user.username) 
  const [favourite, setFavourite] = useState<string>(user?.favoritesSport || 'Football')
 
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [nickname] = useState(user.nickname || "");
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

  // Load persistent avatar when component mounts
  useEffect(() => {
    if (user?.username) {
      const persistentAvatar = AvatarStorage.getAvatar(user.username);
      if (persistentAvatar) {
        console.log('[Profile] Found persistent avatar for', user.username);
        // Don't store base64 data in user object, just mark that avatar exists
        if (!user.avatar || !user.avatar.includes('data:image')) {
          const updatedUser = { ...user, avatar: `persistent_${user.username}` };
          setUser(updatedUser);
          // Store user without base64 data
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    }
  }, [user?.username])

  const handleAvatarUpdate = (newAvatarPath: string) => {
    // Don't store base64 data in user object to avoid localStorage quota issues
    // Instead, store a reference that indicates the user has a persistent avatar
    const updatedUser = { ...user, avatar: `persistent_${user.username}` };
    setUser(updatedUser);
    
    // Store user object without base64 data (base64 is already in AvatarStorage)
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (error) {
      console.warn('[Profile] Failed to update user in localStorage:', error);
    }
    
    // Show success message
    setSuccessMessage('Avatar updated successfully!');
    setError(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
    
    // Force re-render by updating the component state
    setTimeout(() => {
      setUser({ ...updatedUser });
    }, 100);
  };

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)
    
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

    if (oldUsername !== username) {
      console.log("Username changed, reinitializing websocket connection");
      console.log("Old username:", oldUsername);
      console.log("New username:", username);
      setSuccessMessage(`Username successfully changed from "${oldUsername}" to "${username}"!`);
      
      setTimeout(() => {
        initializeWebSocketForNewUser(username);
      }, 500);
      
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
        
        setShowResetConfirm(false)
        setShowResetSection(false)
        
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-1 to-surface-2 bg-gaming-pattern">
      <Header user={user} />  

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-6xl">
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 lg:space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm border border-border/50 h-12 sm:h-14 lg:h-16 p-1">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 sm:gap-3 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              className="flex items-center gap-2 sm:gap-3 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <span>Account</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
              <CardContent className="space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Profile Overview Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-2 mb-2">Profile Overview</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Your current profile information</p>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 sm:p-6 bg-card/30 border border-border/30 rounded-lg">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <AvatarUpload
                          user={user}
                          onAvatarUpdate={handleAvatarUpdate}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator className="bg-border/50" />

                {/* Account Details Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Account Details</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Manage your account information and identity</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="username" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Username
                      </Label>
                      <Input 
                        id="username" 
                        defaultValue={user.username}
                        className=" h-10 sm:h-12 text-sm sm:text-base bg-card/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (e.target.value.trim()) {
                            setError(null);
                            setSuccessMessage(null);
                          }
                        }} 
                      />
                     
                      {error && (
                        <p className="text-xs sm:text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {error}
                        </p>
                      )}
                      {successMessage && (
                        <p className="text-xs sm:text-sm text-green-400 mt-1 flex items-center gap-1">
                          ✓ {successMessage}
                        </p>
                      )}
                    </div>
                    
                                         <div className="space-y-2 sm:space-y-3">
                       <Label htmlFor="email" className="text-sm sm:text-base font-medium flex items-center gap-2">
                         <Settings className="w-4 h-4 text-muted-foreground" />
                         Email Address
                       </Label>
                       <Input 
                         disabled 
                         id="email" 
                         type="email" 
                         defaultValue={user.email}
                         className="text-center h-10 sm:h-12 text-sm sm:text-base bg-muted/50 border-border/30 cursor-not-allowed opacity-60"
                       />
                       <p className="text-xs text-muted-foreground ">Email cannot be changed for security reasons</p>
                     </div>
              
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Personal Details Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Personal Details</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Customize your display name and preferences</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="favoriteSport" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        Favorite Sport
                      </Label>
                      <Select 
                        value={favourite} 
                        onValueChange={(value) => setFavourite(value)}
                      >
                        <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base bg-card/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder="Select your favorite sport">
                            {favourite || "Select your favorite sport"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-md border-border/50">
                          <SelectItem value="Football" className="text-sm sm:text-base">🏈 Football</SelectItem>
                          <SelectItem value="Basketball" className="text-sm sm:text-base">🏀 Basketball</SelectItem>
                          <SelectItem value="Baseball" className="text-sm sm:text-base">⚾ Baseball</SelectItem>
                          <SelectItem value="Tennis" className="text-sm sm:text-base">🎾 Tennis</SelectItem>
                          <SelectItem value="Hockey" className="text-sm sm:text-base">🏒 Hockey</SelectItem>
                          <SelectItem value="Golf" className="text-sm sm:text-base">⛳ Golf</SelectItem>
                          <SelectItem value="Cricket" className="text-sm sm:text-base">🏏 Cricket</SelectItem>
                          <SelectItem value="Volleyball" className="text-sm sm:text-base">🏐 Volleyball</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Used for personalized quiz content</p>
                    </div>
                  </div>
                </div>


              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">Account Preferences</CardTitle>
                <CardDescription className="text-sm sm:text-base">Manage your account settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8">
                {/* Language Settings */}
                <div className="space-y-4 sm:space-y-6">
                  
                  <div className="space-y-2 sm:space-y-3">
                    <Label htmlFor="language" className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Interface Language
                    </Label>
                    <Select defaultValue="en">
                      <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base bg-card/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select your preferred language" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-md border-border/50">
                        <SelectItem value="en" className="text-sm sm:text-base">🇺🇸 English</SelectItem>
                        <SelectItem value="es" className="text-sm sm:text-base">🇪🇸 Spanish</SelectItem>
                        <SelectItem value="fr" className="text-sm sm:text-base">🇫🇷 French</SelectItem>
                        <SelectItem value="de" className="text-sm sm:text-base">🇩🇪 German</SelectItem>
                        <SelectItem value="pt" className="text-sm sm:text-base">🇵🇹 Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                 
                  </div>
                </div>

                <Separator className="bg-border/50" />

   
              </CardContent>
            </Card>

            <Card className="bg-card/95 backdrop-blur-md border-destructive/20 shadow-xl">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm sm:text-base">
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 sm:space-y-6 pt-2">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-card/30 border border-border/30">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Reset Account Statistics</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Reset all your battle statistics, achievements, and history
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full lg:w-auto text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 h-10 sm:h-12 text-sm sm:text-base" 
                      onClick={() => setShowResetSection(true)}
                    >
                      Reset Statistics
                    </Button>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm sm:text-base">Delete Account</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="w-full lg:w-auto h-10 sm:h-12 text-sm sm:text-base"
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
          <Alert className={`mt-4 sm:mt-6 ${
            messageType === 'error' 
              ? 'border-destructive/50 bg-destructive/10' 
              : messageType === 'warning' 
              ? 'border-yellow-500/50 bg-yellow-500/10' 
              : 'border-green-500/50 bg-green-500/10'
          }`}>
            <AlertDescription className={`text-sm sm:text-base ${
              messageType === 'error' 
                ? 'text-destructive' 
                : messageType === 'warning' 
                ? 'text-yellow-600 dark:text-yellow-400' 
                : 'text-green-900 dark:text-green-400'
            }`}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {showResetSection && (
          <Card className="mt-4 sm:mt-6 bg-card/95 backdrop-blur-md border-amber-500/30 shadow-xl">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-lg sm:text-xl">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                Reset Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-sm sm:text-base">
                    Warning: This action will permanently reset your statistics and cannot be undone.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="resetType" className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-muted-foreground" />
                      Reset Type
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Choose what statistics you want to reset</p>
                  </div>
                  
                  <Select value={resetType} onValueChange={setResetType}>
                    <SelectTrigger className="h-12 sm:h-14 text-sm sm:text-base bg-card/50 border-border/50 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
                      <SelectValue placeholder="Select what you want to reset" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-md border-border/50">
                      <SelectItem value="all" className="text-sm sm:text-base py-3">
                        <div className="flex items-center gap-3">
                          {getResetTypeIcon('all')}
                          <div>
                            <span className="font-medium">All Statistics</span>
                            <p className="text-xs text-muted-foreground">Reset everything</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="battles" className="text-sm sm:text-base py-3">
                        <div className="flex items-center gap-3">
                          {getResetTypeIcon('battles')}
                          <div>
                            <span className="font-medium">Battle Statistics</span>
                            <p className="text-xs text-muted-foreground">Wins, losses, win rate</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="ranking" className="text-sm sm:text-base py-3">
                        <div className="flex items-center gap-3">
                          {getResetTypeIcon('ranking')}
                          <div>
                            <span className="font-medium">Ranking Only</span>
                            <p className="text-xs text-muted-foreground">Just your rank position</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="streak" className="text-sm sm:text-base py-3">
                        <div className="flex items-center gap-3">
                          {getResetTypeIcon('streak')}
                          <div>
                            <span className="font-medium">Streak Only</span>
                            <p className="text-xs text-muted-foreground">Current winning streak</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                      Selected: {getResetTypeDescription(resetType)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    onClick={handleResetStats}
                    disabled={isLoading}
                    className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base bg-destructive hover:bg-destructive/90"
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
                    className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showDeleteConfirm && (
          <Card className="mt-4 sm:mt-6 bg-card/95 backdrop-blur-md border-destructive/30 shadow-xl">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                Delete Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 sm:space-y-6">
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <AlertDescription className="text-destructive text-sm sm:text-base">
                    <strong>Warning:</strong> This action will permanently delete your account and all associated data. This cannot be undone.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="deleteConfirm" className="text-sm sm:text-base font-medium flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-destructive" />
                      Confirmation Required
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">Type "DELETE" to confirm this permanent action</p>
                  </div>
                  
                  <div className="space-y-3">
                    <Input
                      id="deleteConfirm"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="h-12 sm:h-14 text-sm sm:text-base border-destructive/50 focus:border-destructive focus:ring-2 focus:ring-destructive/20 text-center font-mono uppercase tracking-wider"
                    />
                    
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="text-xs sm:text-sm text-destructive">
                          <p className="font-medium mb-1">This action will permanently:</p>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                            <li>Delete your account and profile</li>
                            <li>Remove all battle history and statistics</li>
                            <li>Delete all friends and connections</li>
                            <li>Remove all achievements and progress</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {deleteConfirmText && deleteConfirmText !== 'DELETE' && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Please type "DELETE" exactly to proceed
                      </p>
                    )}
                    
                    {deleteConfirmText === 'DELETE' && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        ✓ Confirmation text entered correctly
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Button
                    onClick={handleDelete}
                    disabled={isLoading || deleteConfirmText !== 'DELETE'}
                    className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base bg-destructive hover:bg-destructive/90"
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
                    className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base"
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