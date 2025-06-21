import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { useNavigate, useParams } from 'react-router-dom'
import { Share2, Timer, UserPlus, Undo } from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../shared/ui/sheet"
import { Avatar, AvatarFallback } from '../../shared/ui/avatar'
import { cancelInvitation, invitebattleFriend, notifyBattleDeleted } from '../../shared/websockets/websocket'
import { newSocket } from '../../app/App'

export default function WaitingRoom() {
  const { user } = useGlobalStore()
  const { id } = useParams() as { id: string }
  const navigate = useNavigate()
  const [waitingTime, setWaitingTime] = useState(0)
  const [invitedFriends, setInvitedFriends] = useState<string[]>([])

  useEffect(() => {
    const savedInvitedFriends = localStorage.getItem(`invitedFriends_${id}`)
    if (savedInvitedFriends) {
      setInvitedFriends(JSON.parse(savedInvitedFriends))
    }
    const interval = setInterval(() => {
      setWaitingTime(prev => prev + 1)
    }, 1000)

    // Handle websocket messages for battle_started
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log("Waiting room received message:", data)
        if (data.type === 'battle_started') {
          console.log("Battle started, navigating to countdown from waiting room")
          navigate(`/battle/${data.data}/countdown`)
        }
      } catch (error) {
        console.error("Error parsing websocket message:", error)
      }
    }

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      clearInterval(interval)
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

  const shareInvite = async () => {
    const inviteLink = `${window.location.origin}/waiting/${id}`
    try {
      await navigator.share({
        title: 'Join my Head2Head battle!',
        text: 'Click to join my Head2Head sports battle!',
        url: inviteLink
      })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const quitBattle = async () => {
    try {
      await axios.delete(`http://localhost:8000/delete?battle_id=${id}`)
      invitedFriends.forEach(friend => cancelInvitation(friend, id))
      localStorage.removeItem(`invitedFriends_${id}`)
      
      navigate('/battles')
    } catch (error) {
      console.error('Error deleting battle:', error)
    }
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

              <div className="w-full max-w-md space-y-4">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      View Friends
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
                  onClick={shareInvite}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Invite
                </Button>

                <Button
                  onClick={quitBattle}
                  variant="destructive"
                  className="w-full"
                >
                  Cancel Battle
                </Button>
              </div>

              <p className="text-sm text-gray-500 text-center mt-4">
                Share this battle with your friends or wait for a random opponent to join
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 