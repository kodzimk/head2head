import { useEffect, useState } from "react"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"
import { Button } from "../../shared/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Check, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { acceptFriendRequest, acceptInvitation, rejectFriendRequest, sendMessage } from "../../shared/websockets/websocket"
import { newSocket } from "../../app/App"
import axios from "axios"
import { API_BASE_URL, useRefreshViewStore } from "../../shared/interface/gloabL_var"

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
}

export default function NotificationsPage() {
  const { user, setUser } = useGlobalStore()
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const { refreshView, setRefreshView } = useRefreshViewStore()

  const fetchUserAvatar = async (username: string): Promise<string> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/db/get-user-by-username?username=${username}`)
      return response.data.avatar ? `${API_BASE_URL}${response.data.avatar}` : ''
    } catch (error) {
      console.error(`Error fetching avatar for ${username}:`, error)
      return ''
    }
  }

  const fetchFriendRequestAvatars = async (usernames: string[]) => {
    const avatarMap = new Map<string, string>()
    const avatarPromises = usernames.map(async (username) => {
      const avatar = await fetchUserAvatar(username)
      avatarMap.set(username, avatar)
    })
    await Promise.all(avatarPromises)
    return avatarMap
  }

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
          console.log('Loaded friend requests with avatars:', friendRequestsWithAvatars)
          setFriendRequests(friendRequestsWithAvatars)
        } else {
          setFriendRequests([])
        }
        
        if (user.invitations.length > 0) {
          const invitationPromises = user.invitations.map(async (battle_id: string) => {
            try {
              const response = await axios.get(`${API_BASE_URL}/battle/get-battle?battle_id=${battle_id}`)
              return {
                battle_id,
                sport: response.data.sport,
                duration: response.data.duration
              }
            } catch (error) {
              console.error(`Error fetching battle ${battle_id}:`, error)
              return null
            }
          })
          
          const invitationResults = await Promise.all(invitationPromises)
          const validInvitations = invitationResults.filter(inv => inv !== null) as Invitation[]
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
  }, [user.friendRequests, user.invitations])

  // Handle websocket messages for real-time updates
  useEffect(() => {
    const handleWebSocketMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket message received in notifications:', data.type, data.data)
        
        if (data.type === 'user_updated' && data.data) {
          const updatedUserData = data.data
          
          // Update the global user state if it's the current user
          if (updatedUserData.username === user.username) {
            console.log('Updating user state from websocket:', updatedUserData.friendRequests)
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
            // Update local friendRequests state to reflect the change
            if (updatedUserData.friendRequests.length > 0) {
              const avatarMap = await fetchFriendRequestAvatars(updatedUserData.friendRequests)
              const friendRequestsWithAvatars = updatedUserData.friendRequests.map((request: string) => ({
                sender: {
                  username: request,
                  avatar: avatarMap.get(request) || ''       
                },
                status: 'pending' as const
              }))
              console.log('Updating friend requests with avatars:', friendRequestsWithAvatars)
              setFriendRequests(friendRequestsWithAvatars)
            } else {
              // Clear friend requests if none exist
              setFriendRequests([])
            }
          }
        }
        
        if (data.type === 'friend_request_updated' && data.data) {
          const updatedUserData = data.data
          
          // Update the global user state if it's the current user
          if (updatedUserData.username === user.username) {
            console.log('Updating user state from friend_request_updated:', updatedUserData.friendRequests)
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
            // Update local friendRequests state to reflect the change
            if (updatedUserData.friendRequests.length > 0) {
              const avatarMap = await fetchFriendRequestAvatars(updatedUserData.friendRequests)
              const friendRequestsWithAvatars = updatedUserData.friendRequests.map((request: string) => ({
                sender: {
                  username: request,
                  avatar: avatarMap.get(request) || ''       
                },
                status: 'pending' as const
              }))
              console.log('Updating friend requests with avatars:', friendRequestsWithAvatars)
              setFriendRequests(friendRequestsWithAvatars)
            } else {
              // Clear friend requests if none exist
              setFriendRequests([])
            }
          }
        }
      } catch (error) {
        console.error('Error parsing websocket message:', error)
      }
    }

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage)
      }
    }
  }, [user.username, setUser, friendRequests])

  const handleAcceptRequest = async (username: string) => {
      const request = friendRequests.find(request => request.sender.username === username)
      if (!request) return

      setFriendRequests(prev => prev.filter(req => req.sender.username !== username))
      acceptFriendRequest(user, request.sender.username)
      setRefreshView(true)
  }

  const handleRejectRequest = async (username: string) => {
      const request = friendRequests.find(request => request.sender.username === username)
      if (!request) return

      // Immediately remove the request from local state
      setFriendRequests(prev => prev.filter(req => req.sender.username !== username))

      // Send the reject request
      rejectFriendRequest(user, request.sender.username)
      setRefreshView(true)
  }

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`)
  }

  const handleAcceptInvitation = async (battle_id: string) => {
      setInvitations(prev => prev.filter(invitation => invitation.battle_id !== battle_id))
      user.invitations = user.invitations.filter(invitation => invitation !== battle_id)
      acceptInvitation(user.username, battle_id)
  }

  const handleRejectInvitation = async (battle_id: string) => {
      setInvitations(prev => prev.filter(invitation => invitation.battle_id !== battle_id))
      user.invitations = user.invitations.filter(invitation => invitation !== battle_id)
      sendMessage(user, "user_update")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Notifications</h1>
          
          {isLoading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : friendRequests.length === 0 && invitations.length === 0 ? (
            <div className="text-center text-gray-500">No new notifications</div>
          ) : 
          (
            <div className="space-y-4">
              {friendRequests.map((request) => {
                console.log('Rendering request:', request.sender.username, 'status:', request.status)
                return (
                <Card key={request.sender.username} className="bg-white dark:bg-gray-800">
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => handleViewProfile(request.sender.username)}
                    >
                      <AvatarImage src={request.sender.avatar} alt={request.sender.username} />
                      <AvatarFallback>{'A'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg cursor-pointer hover:text-orange-500 transition-colors" 
                        onClick={() => handleViewProfile(request.sender.username)}
                      >
                        {request.sender.username}
                      </CardTitle>
                      <CardDescription>Wants to be your friend</CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex justify-end gap-2">
                    {request.status === 'pending' ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRejectRequest(request.sender.username)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-orange-500 text-white dark:text-black  hover:bg-orange-600"
                          onClick={() => handleAcceptRequest(request.sender.username)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                      </>
                    ) : (
                      <span className={`text-sm ${
                        request.status === 'accepted' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {request.status === 'accepted' ? 'Accepted' : 'Rejected'}
                      </span>
                    )}
                  </CardFooter>
                </Card>
                )
              })}

              {invitations.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4">Battle Invitations</h2>
                  {invitations.map((invitation, index) => (
                    <Card key={`${invitation.battle_id}-${index}`} className="bg-white dark:bg-gray-800 mb-4">
                      <CardHeader className="flex flex-row justify-center items-center gap-4">
                        <CardTitle>Battle Invitation</CardTitle>
                      </CardHeader>
                      <CardFooter className="flex justify-center gap-2">
                        <Button 
                          size="sm" 
                          className="bg-orange-500 text-white dark:text-black hover:bg-orange-600" 
                          onClick={() => handleAcceptInvitation(invitation.battle_id)}
                        >
                          Accept
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-red-500 text-white dark:text-black hover:bg-red-600" 
                          onClick={() => handleRejectInvitation(invitation.battle_id)}
                        >
                          Reject
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 