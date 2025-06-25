import { useState, useEffect, useRef } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { useNavigate, useParams } from 'react-router-dom'
import { Timer, UserPlus, Undo, AlertCircle } from 'lucide-react'
import Header from '../dashboard/header'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../shared/ui/sheet"
import { Avatar, AvatarFallback } from '../../shared/ui/avatar'
import { cancelInvitation, invitebattleFriend, cancelBattle } from '../../shared/websockets/websocket'
import { newSocket } from '../../app/App'

export default function WaitingRoom() {
  const { user } = useGlobalStore()
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const [waitingTime, setWaitingTime] = useState(0)
  const [invitedFriends, setInvitedFriends] = useState<string[]>([])
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Inactivity timeout duration (10 minutes)
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now()
    
    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
    }
    
    // Set new timeout
    inactivityTimeoutRef.current = setTimeout(() => {
      handleInactivity()
    }, INACTIVITY_TIMEOUT)
  }

  const handleInactivity = async () => {
    console.log('User inactive in waiting room for 10 minutes, removing battle and redirecting')
    
    // Remove the battle
    try {
      cancelBattle(id, user.username)
      invitedFriends.forEach(friend => cancelInvitation(friend, id))
      localStorage.removeItem(`invitedFriends_${id}`)
    } catch (error) {
      console.error('Error removing battle on inactivity:', error)
    }
    
    // Redirect to battle page
    navigate('/battles')
  }

  const handleUserActivity = () => {
    resetInactivityTimer()
  }



  useEffect(() => {
    const savedInvitedFriends = localStorage.getItem(`invitedFriends_${id}`)
    if (savedInvitedFriends) {
      setInvitedFriends(JSON.parse(savedInvitedFriends))
    }
    
    const interval = setInterval(() => {
      setWaitingTime(prev => prev + 1)
    }, 1000)

    // Set up inactivity detection
    resetInactivityTimer()

    // Add event listeners for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    const handleWebSocketMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        if (data.type === 'battle_started') {
          if (data.data === id) {
            navigate(`/battle/${data.data}/countdown`)
          }
        } else if (data.type === 'battle_removed' && data.data === id) {
          // Battle was removed, redirect to battle page
          console.log("Battle was removed, redirecting to battle page"); // Debug logging
          navigate('/battles')
        }
    }

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      clearInterval(interval)
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
      }
      
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
      
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage)
      }
    }
  }, [id, navigate])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const quitBattle = async () => {
      cancelBattle(id, user.username)
      invitedFriends.forEach(friend => cancelInvitation(friend, id))
      localStorage.removeItem(`invitedFriends_${id}`)
      navigate('/battles')
  } 

  const inviteFriend = async (friendUsername: string) => {
    invitebattleFriend(friendUsername, id)
    setInvitedFriends(prev => [...prev, friendUsername])
    localStorage.setItem(`invitedFriends_${id}`, JSON.stringify([...invitedFriends, friendUsername]))
  }

  const undoInvite = async (friendUsername: string) => {
      cancelInvitation(friendUsername, id)  
      setInvitedFriends(prev => {
        const newInvitedFriends = prev.filter(username => username !== friendUsername)
        localStorage.setItem(`invitedFriends_${id}`, JSON.stringify(newInvitedFriends))
        return newInvitedFriends
      })   
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Waiting for Opponent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-2 text-2xl font-bold">
                <Timer className="w-6 h-6" />
                {formatTime(waitingTime)}
               
              </div>

              {/* Show warning about 1v1 limitation */}
              {invitedFriends.length > 0 && (
                <div className="w-full max-w-md p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">1v1 Battle</span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Only one friend can join this battle. The first person to accept will become your opponent.
                  </p>
                </div>
              )}

              <div className="w-full max-w-md space-y-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite Friend
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Friends List</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      {user.friends.length === 0 ? (
                        <p className="text-center text-gray-500">No friends found</p>
                      ) : (
                        user.friends.map((friend: string) => (
                          <div
                            key={friend}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-orange-500 text-white">
                                  {friend.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{friend}</p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => invitedFriends.includes(friend) 
                                ? undoInvite(friend) 
                                : inviteFriend(friend)
                              }
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              {invitedFriends.includes(friend) ? (
                                <>
                                  <Undo className="w-4 h-4 mr-1" />
                                  Undo
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  Invite
                                </>
                              )}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </SheetContent>
                </Sheet>

                <Button
                  onClick={quitBattle}
                  variant="destructive"
                  className="w-full"
                >
                  Cancel Battle
                </Button>
              </div>

              <p className="text-sm text-gray-500 text-center mt-4">
                {invitedFriends.length > 0 
                  ? `Waiting for ${invitedFriends[0]} to join or wait for a random opponent`
                  : 'Share this battle with your friends or wait for a random opponent to join'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 