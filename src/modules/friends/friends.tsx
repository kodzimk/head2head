import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/ui/tabs'
import { GlobalStore } from '../../shared/interface/gloabL_var'
import { useContext } from 'react'
import { Search, UserMinus} from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import type { Friend } from "../../shared/interface/user"


export default function FriendsPage() {
  const { user } = useContext(GlobalStore)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, ''); 
  
    axios.get(`http://localhost:8000/friends/get-friends?email=${userEmail}`).then((response) => {
      const friendsArray = response.data.map((friend: string) => ({
        username: friend,
        status: "online",
        avatar: "https://github.com/shadcn.png",
        rank: "1"
      }));
      setFriends(friendsArray);
    })
  }, [])

  const handleRemoveFriend = async (username: string) => {
    await axios.post(`http://localhost:8000/friends/remove-friend?username=${username}&email=${user.email}`)
    setFriends(friends.filter(friend => friend.username !== username))
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
             
            </TabsList>

            <TabsContent value="friends">
              <Card>
                <CardHeader>
                  <CardTitle>Your Friends</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredFriends.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      No friends found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredFriends.map((friend) => (
                        <div
                          
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
                            onClick={() => handleRemoveFriend(friend.username)}
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

            
          </Tabs>
        </div>
      </main>
    </div>
  )
} 