import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Input } from '../../shared/ui/input'
import { Search, UserMinus} from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import type { Friend, User } from "../../shared/interface/user"
import { useNavigate } from 'react-router-dom'
import { removeFriend } from '../../shared/websockets/websocket'
import { refreshView } from '../../app/App'


export default function FriendsPage({user}: {user: User}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setFriends([])
      user.friends.map(async (friend: string) => {
        try {
          const friendData = await axios.get(`http://localhost:8000/db/get-user-by-username?username=${friend}`);
          setFriends(prev => [...prev, {
            username: friend,
            status: "online",
            avatar: friendData.data.avatar ? `http://localhost:8000${friendData.data.avatar}` : null,
            rank: friendData.data.ranking
          }])
        } catch (error) {
          setFriends(prev => [...prev, {
            username: friend,
            status: "online",
            avatar: null,
            rank: "1"
          }])
        }
      });
  }, [user,refreshView])

  const handleRemoveFriend = async (username: string) => {
    removeFriend(user, username)
    setFriends(friends.filter(friend => friend.username !== username))
    user.friends = user.friends.filter(friend => friend !== username)
  }

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsSearching(true)
      try {
        const response = await axios.get(`http://localhost:8000/friends/search-user?username=${searchQuery}`)
        const userData = await axios.get(`http://localhost:8000/db/get-user-by-username?username=${response.data.username}`)
        setSearchResults([{
          username: response.data.username,
          status: "online",
          avatar: userData.data.avatar ? `http://localhost:8000${userData.data.avatar}` : null,
          rank: userData.data.ranking
        }])
      } catch (error) {
        setSearchResults([])
      }
    } else {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!e.target.value.trim()) {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  const displayedUsers = isSearching ? searchResults : friends
  const emptyMessage = isSearching ? "No users found" : "No friends found"
  const title = isSearching ? "Search Results" : "Your Friends"

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />
      <main className="flex-1 p-4 lg:p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <div className="w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="pl-10 w-full sm:w-64"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              {displayedUsers.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 w-full max-w-full">
                  {displayedUsers.map((item) => (
                    <div
                      key={item.username}
                      className="w-full cursor-pointer p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex flex-col sm:flex-row items-center gap-4 hover:shadow-lg"
                      onClick={() => navigate(`/profile/${item.username}`)}
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.username}
                            className="w-20 h-20 sm:w-14 sm:h-14 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-14 sm:h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {item.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-grow min-w-0 text-center sm:text-left">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate text-lg">
                            {item.username}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Rank: #{item.rank}
                          </p>
                          <div className="flex items-center justify-center sm:justify-start mt-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${item.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                            <span className="ml-2 text-xs text-gray-500">{item.status}</span>
                          </div>
                        </div>
                      </div>
                      {isSearching ? (
                        <Button
                          variant="outline"
                          size="default"
                          className="w-full sm:w-auto min-w-[120px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${item.username}`);
                          }}
                        >
                          View Profile
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="default"
                          className="w-full sm:w-auto min-w-[120px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFriend(item.username);
                          }}
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 