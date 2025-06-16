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
import { useNavigate } from 'react-router-dom'


export default function FriendsPage() {
  const { user } = useContext(GlobalStore)
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

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
    await axios.post(`http://localhost:8000/friends/remove-friend?username=${username}&from_username=${user.username}`)
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
                    <div className="grid grid-cols-1 gap-4 w-full max-w-full">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.username}
                          className="w-full cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg"
                          onClick={() => navigate(`/profile/${friend.username}`)}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <img
                              src={friend.avatar}
                              alt={friend.username}
                              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                            />
                            <div className="flex-grow min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate text-lg">
                                {friend.username}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Rank: #{friend.rank}
                              </p>
                              <div className="flex items-center mt-1">
                                <span className={`inline-block w-2 h-2 rounded-full ${friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                <span className="ml-2 text-xs text-gray-500">{friend.status}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="default"
                            className="sm:flex-shrink-0 w-full sm:w-auto min-w-[120px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFriend(friend.username);
                            }}
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