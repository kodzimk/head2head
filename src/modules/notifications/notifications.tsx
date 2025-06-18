import { useEffect, useState } from "react"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import Header from "../dashboard/header"
import { Button } from "../../shared/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "../../shared/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Check, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { acceptFriendRequest, acceptInvitation, rejectFriendRequest, sendMessage } from "../../shared/websockets/websocket"

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
  const { user } = useGlobalStore()
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const newFriendRequests = user.friendRequests.map(request => ({
      sender: {
        username: request,
        avatar: ''       
      },
      status: 'pending' as const
    }))
    setFriendRequests(newFriendRequests)

    const newInvitations = user.invitations.map(invitation => ({
      battle_id: invitation,
      sport: '',
      duration: 0
    }))
    setInvitations(newInvitations)
    
  }, [user.friendRequests, user.invitations])

  const handleAcceptRequest = async (username: string) => {
    try {
      const request = friendRequests.find(request => request.sender.username === username)
      if (!request) return

      acceptFriendRequest(user, request.sender.username)
      setFriendRequests(prev => prev.filter(request => request.sender.username !== username))
    } catch (error) {
      console.error('Error accepting friend request:', error)
    }
  }

  const handleRejectRequest = async (username: string) => {
      const request = friendRequests.find(request => request.sender.username === username)
      if (!request) return

      rejectFriendRequest(user, request.sender.username)
      setFriendRequests(prev => prev.filter(request => request.sender.username !== username))
  }

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`)
  }

  const handleAcceptInvitation = async (battle_id: string) => {
    try {  
      setInvitations(prev => prev.filter(invitation => invitation.battle_id !== battle_id))
      user.invitations = user.invitations.filter(invitation => invitation !== battle_id)
      acceptInvitation(user.username, battle_id)
    } catch (error) {
      console.error('Error accepting invitation:', error)
    }
  }

  const handleRejectInvitation = async (battle_id: string) => {
    try {
      setInvitations(prev => prev.filter(invitation => invitation.battle_id !== battle_id))
      user.invitations = user.invitations.filter(invitation => invitation !== battle_id)
      await sendMessage(user, "user_update")
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      // Revert the state changes if there was an error
      setInvitations(prev => [...prev, { battle_id, sport: '', duration: 0 }])
      user.invitations.push(battle_id)
    }
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
              {friendRequests.map((request) => (
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
              ))}

              {invitations.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4">Battle Invitations</h2>
                  {invitations.map((invitation, index) => (
                    <Card key={`${invitation.battle_id}-${index}`} className="bg-white dark:bg-gray-800 mb-4">
                      <CardHeader className="flex flex-row items-center gap-4">
                        <CardTitle>Battle Invitation</CardTitle>
                      </CardHeader>
                      <CardFooter className="flex justify-end gap-2">
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