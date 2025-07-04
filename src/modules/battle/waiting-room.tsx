import { useState, useEffect, useRef } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { useNavigate, useParams } from 'react-router-dom'
import { Timer, UserPlus, Undo, AlertCircle, Clock } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../shared/ui/tooltip"

export default function WaitingRoom() {
  const { t } = useTranslation()
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
    console.log('Waiting room component mounted for battle:', id)
    
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
        console.log('Waiting room received websocket message:', event.data)
        const data = JSON.parse(event.data)
        console.log('Waiting room parsed data:', data)
        
        if (data.type === 'battle_started') {
          if (data.data === id) {
            navigate(`/${data.data}/countdown`)
          }
        } else if (data.type === 'battle_removed' && data.data === id) {
          // Battle was removed, redirect to battle page
          console.log("Battle was removed, redirecting to battle page"); // Debug logging
          navigate('/battles')
        }
        else if(data.type === 'invitation_rejected'){
          console.log('Waiting room received invitation_rejected:', data.data)
          setInvitedFriends(prev => {
            const newInvitedFriends = prev.filter(friend => friend !== data.data.rejected_by)
            console.log('Filtered invited friends:', newInvitedFriends)
            localStorage.setItem(`invitedFriends_${id}`, JSON.stringify(newInvitedFriends))
            return newInvitedFriends
          })
          console.log("Invited friends updated")
        }
    }


    if (newSocket) {
      console.log('Adding websocket event listener to waiting room')
      newSocket.addEventListener('message', handleWebSocketMessage)
    } else {
      console.log('No websocket connection available in waiting room')
    }

    // Listen for localStorage changes from App.tsx
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `invitedFriends_${id}` && e.newValue) {
        console.log('LocalStorage updated for invited friends:', e.newValue)
        setInvitedFriends(JSON.parse(e.newValue))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Listen for custom invitation rejection event from App.tsx
    const handleInvitationRejected = (e: CustomEvent) => {
      if (e.detail.battleId === id) {
        console.log('Waiting room received invitation rejection event:', e.detail)
        setInvitedFriends(e.detail.updatedInvitedFriends)
      }
    }
    
    window.addEventListener('invitationRejected', handleInvitationRejected as EventListener)

    return () => {
      clearInterval(interval)
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current)
      }
      
      // Remove event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
      
      // Remove storage event listener
      window.removeEventListener('storage', handleStorageChange)
      
      // Remove custom invitation rejection event listener
      window.removeEventListener('invitationRejected', handleInvitationRejected as EventListener)
      
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
    setInvitedFriends(prev => {
      const newInvitedFriends = [...prev, friendUsername]
      localStorage.setItem(`invitedFriends_${id}`, JSON.stringify(newInvitedFriends))
      return newInvitedFriends
    })
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
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header />
      <main className="container-gaming py-8">
        <Card className="card-surface max-w-2xl mx-auto">
          <CardHeader className="responsive-padding">
            <CardTitle className="text-responsive-lg text-center flex items-center justify-center gap-2">
              <Timer className="w-6 h-6 text-primary" />
              {t('battles.waitingForOpponent')}
            </CardTitle>
          </CardHeader>
          <CardContent className="responsive-padding space-y-6">
            {/* Waiting Animation */}
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                <div className="absolute inset-0 rounded-full border-4 border-muted animate-spin"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Timer className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-pulse" />
                </div>
              </div>
              
              <div>
                <p className="text-responsive-base font-medium text-foreground">
                  {t('battles.battleStartingSoon')}
                </p>
                <p className="text-responsive-sm text-muted-foreground mt-1">
                  {t('battles.waitingForAnotherPlayer')}
                </p>
              </div>
            </div>

            {/* Battle Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{t('battles.waitingTime')}</div>
                  <div className="text-2xl font-bold text-primary">{formatTime(waitingTime)}</div>
                </div>
              </div>

            </div>

            {/* Inactivity Warning */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium">{t('battles.autoCancel')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('battles.autoCancelDesc')}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-full sm:flex-1">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button 
                            className="w-full" 
                            size="lg" 
                            disabled={invitedFriends.length > 0}
                          >
                            <UserPlus className="w-5 h-5 mr-2" />
                            {t('battles.inviteFriends')}
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>{t('battles.inviteFriendsToBattle')}</SheetTitle>
                          </SheetHeader>
                          <div className="py-4">
                            {user.friends && user.friends.length > 0 ? (
                              <div className="space-y-4">
                                {user.friends.map((friend) => {
                                  const isInvited = invitedFriends.includes(friend)
                                  return (
                                    <div key={friend} className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Avatar>
                                          <AvatarFallback>{friend[0].toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{friend}</span>
                                      </div>
                                      <Button
                                        variant={isInvited ? "destructive" : "default"}
                                        onClick={() => isInvited ? undoInvite(friend) : inviteFriend(friend)}
                                        size="sm"
                                        disabled={!isInvited && invitedFriends.length > 0}
                                      >
                                        {isInvited ? (
                                          <>
                                            <Undo className="w-4 h-4 mr-2" />
                                            {t('battles.cancelInvite')}
                                          </>
                                        ) : (
                                          <>
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            {t('battles.invite')}
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground">
                                {t('battles.noFriendsToInvite')}
                              </div>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {invitedFriends.length > 0 
                      ? t('battles.oneInviteAtATime') 
                      : t('battles.inviteFriendsToBattle')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button 
                onClick={quitBattle} 
                variant="destructive"
                size="lg"
                className="w-full sm:flex-1"
              >
                {t('battles.cancelBattle')}
              </Button>
            </div>

            {/* Invited Friends Status */}
            {invitedFriends.length > 0 && (
              <Card className="card-surface-1">
                <CardContent className="responsive-padding">
                  <h3 className="text-responsive-sm font-medium text-foreground mb-3">Invited Friends ({invitedFriends.length})</h3>
                  <div className="space-y-2">
                    {invitedFriends.map((friendUsername, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6" variant="faceit">
                            <AvatarFallback username={friendUsername} variant="faceit" />
                          </Avatar>
                          <span className="text-responsive-xs text-foreground">{friendUsername}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-responsive-xs text-warning">⏳ Pending</span>
                          <Button
                            onClick={() => undoInvite(friendUsername)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Undo className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 