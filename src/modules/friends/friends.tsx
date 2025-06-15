import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs'
import { GlobalStore } from '../../shared/interface/gloabL_var'
import { useContext } from 'react'
import { Search, UserMinus, UserCheck, UserX } from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'

interface Friend {
  id: string
  username: string
  email: string
  avatar: string
  status: 'online' | 'offline'
  lastSeen?: string
}

interface FriendRequest {
  id: string
  username: string
  email: string
  avatar: string
  sentAt: string
}

export default function FriendsPage() {
  const { user } = useContext(GlobalStore)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
   
  }, [])

  const fetchFriends = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/db/get-friends?email=${user.email}`)
      setFriends(response.data)
    } catch (error) {
      console.error('Error fetching friends:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/db/get-friend-requests?email=${user.email}`)
      setFriendRequests(response.data)
    } catch (error) {
      console.error('Error fetching friend requests:', error)
    }
  }

  const handleAddFriend = async (email: string) => {
    try {
      await axios.post('http://localhost:8000/db/send-friend-request', {
        senderEmail: user.email,
        receiverEmail: email
      })
      // Show success message or update UI
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await axios.post('http://localhost:8000/db/accept-friend-request', {
        requestId,
        userEmail: user.email
      })
      fetchFriends()
      fetchFriendRequests()
    } catch (error) {
      console.error('Error accepting friend request:', error)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await axios.post('http://localhost:8000/db/reject-friend-request', {
        requestId,
        userEmail: user.email
      })
      fetchFriendRequests()
    } catch (error) {
      console.error('Error rejecting friend request:', error)
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await axios.post('http://localhost:8000/db/remove-friend', {
        userEmail: user.email,
        friendId
      })
      fetchFriends()
    } catch (error) {
      console.error('Error removing friend:', error)
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />
      <main className="flex-1 p-4 lg:p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>

          <Tabs defaultValue="friends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">Friend Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="friends">
              <Card>
                <CardHeader>
                  <CardTitle>Your Friends</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No friends found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <img
                              src={friend.avatar}
                              alt={friend.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {friend.username}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {friend.status === 'online' ? 'Online' : 'Offline'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveFriend(friend.id)}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Friend Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRequests.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No pending friend requests
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {friendRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            <img
                              src={request.avatar}
                              alt={request.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {request.username}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Sent {new Date(request.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleAcceptRequest(request.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Accept
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectRequest(request.id)}
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
} 