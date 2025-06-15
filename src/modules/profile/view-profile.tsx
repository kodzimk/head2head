import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { User } from '../../shared/interface/user'
import axios from 'axios'
import { Button } from '../../shared/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useGlobalStore } from '../../shared/interface/gloabL_var'


export const ViewProfile = () => {
  const { username } = useParams<{ username: string }>()
  const [user, setUser] = useState({
    username: '',
    email: '',
    avatar: '',
    favoritesSport: '',
    rank: 0,
    wins: 0,
    winRate: 0,
    streak: 0,
    totalBattle: 0,
  }) 

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestSent, setRequestSent] = useState(false)
  const {user: currentUser} = useGlobalStore()  
  const navigate = useNavigate()
  
  const handleSendRequest = async () => {
    try {
      await axios.post(`http://localhost:8000/db/friend-requests?username=${user.username}&from_username=${currentUser.username}`)
      setRequestSent(true)
    } catch (error) {
      console.error('Error sending friend request:', error)
    }
  };

  const handleCancelRequest = async () => {
    try {
      await axios.post(`http://localhost:8000/db/cancel-friend-request?username=${user.username}&from_username=${currentUser.username}`)
      setRequestSent(false)
    } catch (error) {
      console.error('Error canceling friend request:', error)
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/db/get-user-by-username?username=${username}`)
        console.log(response.data)
        user.username = response.data.username
        user.email = response.data.email

        user.favoritesSport = response.data.favourite
        user.rank = response.data.ranking
        user.wins = response.data.winBattle
        user.winRate = response.data.winRate
        user.totalBattle = response.data.totalBattle
        setUser(user)
      } catch (err) {
        setError('Failed to load user profile')
        console.error('Error fetching user:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (username) {
      fetchUser()
    }
   
  }, [username])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error || 'User not found'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
   <header className='bg-white dark:bg-gray-800 lg:px-12 p-4 py-4 flex items-center justify-between'>
    <div className="container mx-auto">
      <div className="flex items-center">
          <Button className='bg-transparent' onClick={() => navigate(-1)}>
            <ArrowLeft className='text-orange-500 hover:text-orange-600' />
           
          </Button>
      </div>
    </div>
   </header>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.username}'s avatar`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-orange-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.username}</h1>
                  <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Favorite Sport</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{user.favoritesSport}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rank</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">#{user.rank}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Wins</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{user.wins}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Win Rate</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{user.winRate}%</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Streak</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{user.streak}</p>
                </div>
              </div>

              {currentUser.email !== user.email && (
                <div className="flex justify-center gap-4 mt-6">
                  {!requestSent ? (
                    <Button 
                      onClick={handleSendRequest}
                      className="w-full sm:w-auto bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Send Request
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleCancelRequest}
                      variant="outline"
                      className="w-full sm:w-auto border-orange-500 text-orange-500 hover:bg-orange-50 dark:text-orange-500 dark:border-orange-500"
                    >
                      Cancel Friend Request
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 