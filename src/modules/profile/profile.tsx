import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shared/ui/select"
import { Separator } from "../../shared/ui/separator"
import { Alert, AlertDescription } from "../../shared/ui/alert"
import {
  Settings,
  AlertTriangle,
  Save,
  Loader2,
  User,
  Trophy,
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
import { useTranslation } from "react-i18next"
export default function ProfileSettingsPage() {
  const navigate = useNavigate()
  const {  t } = useTranslation()
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
  const [, setShowResetSection] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetType] = useState('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (user?.favoritesSport) {
      setFavourite(user.favoritesSport)
    }
  }, [user?.favoritesSport])

  // Load persistent avatar when component mounts
  useEffect(() => {
    const loadPersistentAvatar = async () => {
      if (user?.username) {
        const persistentAvatar = await AvatarStorage.getAvatar(user.username);
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
    };

    loadPersistentAvatar();
  }, [user?.username])

  const handleAvatarUpdate = () => {
    const updatedUser = { ...user, avatar: `persistent_${user.username}` }
    setUser(updatedUser)
    
    try {
      localStorage.setItem('user', JSON.stringify(updatedUser))
    } catch (error) {
      console.warn('[Profile] Failed to update user in localStorage:', error)
    }
    
    setSuccessMessage(t('profile.settings.profile.avatarUpdated'))
    setError(null)
    
    setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)
    
    setTimeout(() => {
      setUser({ ...updatedUser })
    }, 100)
  }

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)
    
    if (!username.trim()) {
      setError(t('profile.settings.profile.errors.usernameEmpty'))
      return
    }
    
    if (username.trim().length < 3) {
      setError(t('profile.settings.profile.errors.usernameShort'))
      return
    }
    
    const response = await axios.get(`${API_BASE_URL}/auth/username-user?username=${username}`)
    if (response.data === true && username !== user.username && username !== '') {
      setError(t('profile.settings.profile.errors.usernameExists'))
      return
    }
    
    const oldUsername = user.username
    user.favoritesSport = favourite;
    user.nickname = nickname;
    user.username = username;
    
    // Preserve language preference if not set
    if (!user.language) {
      user.language = "en";
    }
    
    // Handle avatar reference update for username change
    if (oldUsername !== username && user.avatar && user.avatar.startsWith('persistent_')) {
      user.avatar = `persistent_${username}`;
      console.log(`Updated avatar reference from "${oldUsername}" to "${username}"`);
    }
    
    setUser(user)
    setIsLoading(true)
    localStorage.setItem('username', username)
    sendMessage(user, "user_update")

    if (oldUsername !== username) {
      console.log("Username changed, reinitializing websocket connection");
      console.log("Old username:", oldUsername);
      console.log("New username:", username);
      
      // Migrate avatar data to new username
      AvatarStorage.migrateAvatar(oldUsername, username);
      
      setSuccessMessage(t('profile.settings.profile.usernameChanged', { old: oldUsername, new: username }));
      
      setTimeout(() => {
        initializeWebSocketForNewUser(username);
      }, 500);
      
    } else {
      setSuccessMessage(t('profile.settings.profile.saved'));
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
        setMessage(t('profile.settings.stats.reset.success') + ' ' + response.data.message)
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
      setMessage(error.response?.data?.detail || t('profile.settings.stats.reset.failed'))
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    if (deleteConfirmText !== user.username) {
      setMessage(t('profile.settings.profile.account.delete.username_mismatch'))
      setMessageType('error')
      return
    }

    try {
      setIsDeleting(true)
      await deleteUser()
      localStorage.clear()
      navigate('/sign-in')
    } catch (error) {
      console.error('Failed to delete account:', error)
      setError(t('common.error'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-1 to-surface-2 bg-gaming-pattern">
      <Header />  

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 max-w-6xl">
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">{t('profile.settings.title')}</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">{t('profile.settings.description')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 lg:space-y-8">
          <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm border border-border/50 h-12 sm:h-14 lg:h-16 p-1">
            <TabsTrigger 
              value="profile" 
              className="flex items-center gap-2 sm:gap-3 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <span>{t('profile.settings.tabs.profile')}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              className="flex items-center gap-2 sm:gap-3 h-full text-xs sm:text-sm lg:text-base font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              <span>{t('profile.settings.tabs.account')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
              <CardContent className="space-y-6 sm:space-y-8 lg:space-y-10">
                {/* Profile Overview Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mt-2 mb-2">
                      {t('profile.settings.profile.overview.title')}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('profile.settings.profile.overview.description')}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 sm:p-6 ">
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
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                      {t('profile.settings.profile.account.title')}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('profile.settings.profile.account.description')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="username" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {t('profile.settings.profile.fields.username.label')}
                      </Label>
                      <Input 
                        id="username" 
                        defaultValue={user.username}
                        placeholder={t('profile.settings.profile.fields.username.placeholder')}
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
                         {t('profile.settings.profile.fields.email.label')}
                       </Label>
                       <Input 
                         disabled 
                         id="email" 
                         type="email" 
                         defaultValue={user.email}
                         className="text-center h-10 sm:h-12 text-sm sm:text-base bg-muted/50 border-border/30 cursor-not-allowed opacity-60"
                       />
                       <p className="text-xs text-muted-foreground ">{t('profile.settings.profile.personal.email.cannotChange')}</p>
                     </div>
              
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Personal Details Section */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{t('profile.settings.profile.personal.title')}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('profile.settings.profile.personal.description')}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        
                    <div className="space-y-2 sm:space-y-3">
                      <Label htmlFor="favoriteSport" className="text-sm sm:text-base font-medium flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        {t('profile.settings.profile.sports.title')}
                      </Label>
                      <Select 
                        value={favourite} 
                        onValueChange={(value) => setFavourite(value)}
                      >
                        <SelectTrigger className="h-10 sm:h-12 text-sm sm:text-base bg-card/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20">
                          <SelectValue placeholder={t('profile.settings.profile.sports.placeholder')}>
                            {favourite || t('profile.settings.profile.sports.placeholder')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-md border-border/50">
                          <SelectItem value="Football" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.football')}</SelectItem>
                          <SelectItem value="Basketball" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.basketball')}</SelectItem>
                          <SelectItem value="Baseball" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.baseball')}</SelectItem>
                          <SelectItem value="Tennis" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.tennis')}</SelectItem>
                          <SelectItem value="Hockey" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.hockey')}</SelectItem>
                          <SelectItem value="Golf" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.golf')}</SelectItem>
                          <SelectItem value="Cricket" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.cricket')}</SelectItem>
                          <SelectItem value="Volleyball" className="text-sm sm:text-base">{t('profile.settings.profile.sports.options.volleyball')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">{t('profile.settings.profile.sports.description')}</p>
                    </div>
                  </div>
                </div>


              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base">
                  {t('profile.settings.profile.buttons.cancel')}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className="w-full sm:w-auto h-10 sm:h-12 text-sm sm:text-base bg-primary hover:bg-primary/90 transition-all duration-200"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('profile.settings.profile.buttons.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('profile.settings.profile.buttons.save')}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="account" className="space-y-4 sm:space-y-6 lg:space-y-8">
            <Card className="bg-card/95 backdrop-blur-md border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle>{t('profile.settings.profile.account.title')}</CardTitle>
                <CardDescription>{t('profile.settings.profile.account.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-base font-medium">{t('profile.settings.profile.account.reset.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('profile.settings.profile.account.reset.description')}</p>
                    
                    <Button
                      variant="destructive"
                      onClick={handleResetStats}
                      disabled={isLoading}
                    >
                      {showResetConfirm ? t('profile.settings.profile.account.reset.confirm_button') : t('profile.settings.profile.account.reset.button')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-base font-medium">{t('profile.settings.profile.account.delete.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('profile.settings.profile.account.delete.description')}</p>
                    
                    {showDeleteConfirm && (
                      <div className="space-y-4 mt-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                        <div className="space-y-2">
                          <h5 className="text-base font-medium text-destructive">
                            {t('profile.settings.profile.account.delete.confirmation_title')}
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {t('profile.settings.profile.account.delete.confirmation_description')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-destructive">
                            {t('profile.settings.profile.account.delete.type_confirmation', { username: user.username })}
                          </Label>
                          <Input
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="bg-card/50 border-destructive/50 focus:border-destructive focus:ring-destructive/20"
                            placeholder={user.username}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="w-full sm:w-auto"
                          >
                            {t('profile.settings.profile.account.delete.cancel_button')}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteConfirmText !== user.username || isDeleting}
                            className="w-full sm:w-auto"
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {t('common.loading')}
                              </>
                            ) : (
                              t('profile.settings.profile.account.delete.confirm_button')
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {!showDeleteConfirm && (
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        className="mt-2"
                      >
                        {t('profile.settings.profile.account.delete.button')}
                      </Button>
                    )}
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
      </main>
    </div>
  )
}