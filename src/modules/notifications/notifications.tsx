import { useEffect, useState, useCallback } from "react"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"
import { Button } from "../../shared/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Check, X, Bell, Trophy } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { acceptFriendRequest, acceptInvitation, rejectFriendRequest, rejectInvitation } from "../../shared/websockets/websocket"
import { newSocket } from "../../app/App"
import axios from "axios"
import { API_BASE_URL, useRefreshViewStore } from "../../shared/interface/gloabL_var"
import { useTranslation } from "react-i18next"
import { Badge } from "../../shared/ui/badge"

interface FriendRequest {
  sender: {
    username: string
    avatar: string
  }
  status: 'pending' | 'accepted' | 'rejected'
}

interface Invitation {
  battle_id: string
  sport: string
  duration: number
  status?: 'pending' | 'accepted' | 'rejected'
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const { user, setUser } = useGlobalStore()
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [invitationResponses, setInvitationResponses] = useState<Map<string, 'accepted' | 'rejected'>>(new Map())
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const { setRefreshView } = useRefreshViewStore()

  const fetchUserAvatar = useCallback(async (username: string): Promise<string> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${username}`)
      return response.data.avatar ? `${API_BASE_URL}${response.data.avatar}` : ''
    } catch (error) {
      console.error(`Error fetching avatar for ${username}:`, error)
      return ''
    }
  }, [])

  const fetchFriendRequestAvatars = useCallback(async (usernames: string[]) => {
    const avatarMap = new Map<string, string>()
    // Process in batches of 3 to avoid too many parallel requests
    const batchSize = 3
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize)
      const avatarPromises = batch.map(async (username) => {
        const avatar = await fetchUserAvatar(username)
        avatarMap.set(username, avatar)
      })
      await Promise.all(avatarPromises)
      // Add small delay between batches
      if (i + batchSize < usernames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    return avatarMap
  }, [fetchUserAvatar])

  useEffect(() => {
    const loadFriendRequestsWithAvatars = async () => {
      try {
        if (user.friendRequests.length > 0) {
          const avatarMap = await fetchFriendRequestAvatars(user.friendRequests)
          const friendRequestsWithAvatars = user.friendRequests.map((request: string) => ({
            sender: {
              username: request,
              avatar: avatarMap.get(request) || ''       
            },
            status: 'pending' as const
          }))
          setFriendRequests(friendRequestsWithAvatars)
        } else {
          setFriendRequests([])
        }
        
        if (user.invitations.length > 0) {
          // Process invitations in batches of 3
          const batchSize = 3
          const validInvitations: Invitation[] = []
          
          for (let i = 0; i < user.invitations.length; i += batchSize) {
            const batch = user.invitations.slice(i, i + batchSize)
            const batchPromises = batch.map(async (battle_id: string) => {
              try {
                const response = await axios.get(`${API_BASE_URL}/battle/get-battle?battle_id=${battle_id}`)
                return {
                  battle_id,
                  sport: response.data.sport,
                  duration: response.data.duration,
                  status: 'pending' as const
                }
              } catch (error) {
                console.error(`Error fetching battle ${battle_id}:`, error)
                return {
                  battle_id,
                  sport: 'football',
                  duration: 0,
                  status: 'pending' as const
                }
              }
            })
            
            const batchResults = await Promise.all(batchPromises)
            validInvitations.push(...batchResults)
            
            // Add small delay between batches
            if (i + batchSize < user.invitations.length) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
          }
          
          setInvitations(validInvitations)
        } else {
          setInvitations([])
        }
        
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading notifications:', error)
        setIsLoading(false)
      }
    }

    loadFriendRequestsWithAvatars()
  }, [user.friendRequests, user.invitations, fetchFriendRequestAvatars])

  // Optimize websocket handler to avoid duplicate code
  const handleUserUpdate = useCallback(async (updatedUserData: any) => {
    if (updatedUserData.email === user.email) {
      const updatedUser = {
        email: updatedUserData.email,
        username: updatedUserData.username,
        wins: updatedUserData.winBattle,
        favoritesSport: updatedUserData.favourite,
        rank: updatedUserData.ranking,
        winRate: updatedUserData.winRate,
        totalBattles: updatedUserData.totalBattle,
        streak: updatedUserData.streak,
        password: updatedUserData.password,
        friends: updatedUserData.friends,
        friendRequests: updatedUserData.friendRequests,
        avatar: updatedUserData.avatar,
        battles: updatedUserData.battles,
        invitations: updatedUserData.invitations
      }
      setUser(updatedUser)
      setRefreshView(true)

      // Update friend requests
      if (updatedUserData.friendRequests.length > 0) {
        const avatarMap = await fetchFriendRequestAvatars(updatedUserData.friendRequests)
        const friendRequestsWithAvatars = updatedUserData.friendRequests.map((request: string) => ({
          sender: {
            username: request,
            avatar: avatarMap.get(request) || ''       
          },
          status: 'pending' as const
        }))
        setFriendRequests(friendRequestsWithAvatars)
      } else {
        setFriendRequests([])
      }

      // Update invitations
      if (updatedUserData.invitations?.length > 0) {
        const batchSize = 3
        const validInvitations: Invitation[] = []
        
        for (let i = 0; i < updatedUserData.invitations.length; i += batchSize) {
          const batch = updatedUserData.invitations.slice(i, i + batchSize)
          const batchPromises = batch.map(async (battle_id: string) => {
            try {
              const response = await axios.get(`${API_BASE_URL}/battle/get-battle?battle_id=${battle_id}`)
              return {
                battle_id,
                sport: response.data.sport,
                duration: response.data.duration,
                status: 'pending' as const
              }
            } catch (error) {
              console.error(`Error fetching battle ${battle_id}:`, error)
              return {
                battle_id,
                sport: 'football',
                duration: 0,
                status: 'pending' as const
              }
            }
          })
          
          const batchResults = await Promise.all(batchPromises)
          validInvitations.push(...batchResults)
          
          if (i + batchSize < updatedUserData.invitations.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        setInvitations(validInvitations)
      } else {
        setInvitations([])
      }
    }
  }, [user.email, setUser, setRefreshView, fetchFriendRequestAvatars])

  // Handle websocket messages for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if ((data.type === 'user_updated' || data.type === 'friend_request_updated') && data.data) {
          await handleUserUpdate(data.data)
        }
      } catch (error) {
        console.error('Error handling websocket message:', error)
      }
    }

    const socket = newSocket
    if (socket) {
      socket.addEventListener('message', handleWebSocketMessage)
      
      return () => {
        socket.removeEventListener('message', handleWebSocketMessage)
      }
    }
    return undefined
  }, [handleUserUpdate])

  const handleAcceptRequest = async (username: string) => {
    try {
      await acceptFriendRequest(user, username)
      const updatedRequests = friendRequests.map(request =>
        request.sender.username === username
          ? { ...request, status: 'accepted' as const }
          : request
      )
      setFriendRequests(updatedRequests)
    } catch (error) {
      console.error('Error accepting friend request:', error)
    }
  }

  const handleRejectRequest = async (username: string) => {
    try {
      await rejectFriendRequest(user, username)
      const updatedRequests = friendRequests.map(request =>
        request.sender.username === username
          ? { ...request, status: 'rejected' as const }
          : request
      )
      setFriendRequests(updatedRequests)
    } catch (error) {
      console.error('Error rejecting friend request:', error)
    }
  }

  const handleViewProfile = (username: string) => {
    navigate(`/view-profile/${username}`)
  }

  const handleAcceptInvitation = async (battle_id: string) => {
    try {
      setProcessingInvitations(prev => new Set([...prev, battle_id]))
      await acceptInvitation(user.username, battle_id)
      setInvitationResponses(prev => new Map(prev).set(battle_id, 'accepted'))
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(battle_id)
        return newSet
      })
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(battle_id)
        return newSet
      })
    }
  }

  const handleRejectInvitation = async (battle_id: string) => {
    try {
      setProcessingInvitations(prev => new Set([...prev, battle_id]))
      await rejectInvitation(user.username, battle_id)
      setInvitationResponses(prev => new Map(prev).set(battle_id, 'rejected'))
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(battle_id)
        return newSet
      })
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      setProcessingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(battle_id)
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-medium">{t('notifications.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasNotifications = friendRequests.length > 0 || invitations.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{t('notifications.title')}</h1>
        </div>

        {!hasNotifications && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('notifications.allClear')}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('notifications.noNewNotifications')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <section className="space-y-6 mb-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{t('notifications.friendRequests')}</h2>
              <Badge variant="secondary" className="rounded-full">
                {friendRequests.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {friendRequests.map((request) => (
                <Card key={request.sender.username} className="overflow-hidden transition-all hover:shadow-md">
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 cursor-pointer transition-transform hover:scale-105"
                              onClick={() => handleViewProfile(request.sender.username)}>
                        <AvatarImage src={request.sender.avatar} />
                        <AvatarFallback className="text-lg">
                          {request.sender.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex flex-col justify-center">
                        <CardTitle className="text-lg hover:text-primary cursor-pointer"
                                  onClick={() => handleViewProfile(request.sender.username)}>
                          {request.sender.username}
                        </CardTitle>
                        <CardDescription className="text-md">{t('notifications.sentYouRequest')}</CardDescription>
                      </div>
                      {/* Friend Request Buttons */}
                      <div className="flex items-center gap-1 xs:gap-2 flex-col sm:flex-row w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-w-[5.5rem] xs:w-20 sm:w-24 h-7 xs:h-8 sm:h-9 text-[10px] xs:text-xs px-1.5 xs:px-3 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRejectRequest(request.sender.username)}
                          disabled={request.status !== 'pending'}
                        >
                          <X className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2 flex-shrink-0" />
                          <span className="truncate">{t('common.reject')}</span>
                        </Button>
                        <Button
                          size="sm"
                          className="min-w-[5.5rem] xs:w-20 sm:w-24 h-7 xs:h-8 sm:h-9 text-[10px] xs:text-xs px-1.5 xs:px-3"
                          onClick={() => handleAcceptRequest(request.sender.username)}
                          disabled={request.status !== 'pending'}
                        >
                          <Check className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2 flex-shrink-0" />
                          <span className="truncate">{t('common.accept')}</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Battle Invitations Section */}
        {invitations.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{t('notifications.battleInvitations')}</h2>
              <Badge variant="secondary" className="rounded-full">
                {invitations.length}
              </Badge>
            </div>
            <div className="grid gap-4">
              {invitations.map((invitation) => {
                const response = invitationResponses.get(invitation.battle_id);
                const isProcessing = processingInvitations.has(invitation.battle_id);

                return (
                  <Card key={invitation.battle_id} className="overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {t('notifications.battleInvite', { sport: invitation.sport })}
                          </CardTitle>
                          <CardDescription>
                            {t('notifications.duration', { duration: invitation.duration })}
                          </CardDescription>
                        </div>
                        {/* Battle Invitation Buttons */}
                        <div className="flex items-center gap-1 xs:gap-2 flex-col sm:flex-row w-full sm:w-auto">
                          {response ? (
                            <>
                              <Badge
                                variant={response === 'accepted' ? 'default' : 'destructive'}
                                className="w-full sm:w-auto px-4 py-1.5 text-center"
                              >
                                {response === 'accepted' ? t('common.accepted') : t('common.rejected')}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="min-w-[5.5rem] xs:w-20 sm:w-24 h-7 xs:h-8 sm:h-9 text-[10px] xs:text-xs px-1.5 xs:px-3 transition-colors hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleRejectInvitation(invitation.battle_id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <div className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                ) : (
                                  <>
                                    <X className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2 flex-shrink-0" />
                                    <span className="truncate">{t('common.reject')}</span>
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                className="min-w-[5.5rem] xs:w-20 sm:w-24 h-7 xs:h-8 sm:h-9 text-[10px] xs:text-xs px-1.5 xs:px-3"
                                onClick={() => handleAcceptInvitation(invitation.battle_id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <div className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                ) : (
                                  <>
                                    <Check className="h-2.5 w-2.5 xs:h-3 xs:w-3 sm:h-4 sm:w-4 mr-0.5 xs:mr-1 sm:mr-2 flex-shrink-0" />
                                    <span className="truncate">{t('common.accept')}</span>
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
} 