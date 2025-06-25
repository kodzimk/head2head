import { useState, useEffect, useRef } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { Play, Clock, Trophy, RefreshCw } from 'lucide-react'
import Header from '../dashboard/header'
import { Avatar, AvatarFallback, AvatarImage } from '../../shared/ui/avatar'
import { joinBattle, notifyBattleCreated, sendMessage, cancelBattle } from '../../shared/websockets/websocket'
import { newSocket, reconnectWebSocket } from '../../app/App'
import { Label } from '../../shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'
import { useBattleStore } from '../../shared/interface/gloabL_var'
import { useLocation } from 'react-router-dom'

export default function BattlePage() {
  const { user } = useGlobalStore()
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const { battle } = useBattleStore()
  const location = useLocation()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreatingBattle, setIsCreatingBattle] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [creationSuccess, setCreationSuccess] = useState(false)
  const [isBattleBeingCreated, setIsBattleBeingCreated] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  

  const refreshWaitingBattles = async (showNotification = false) => {
    if (user.username) {
      setIsRefreshing(true);
      console.log("Refreshing waiting battles for user:", user.username); // Debug logging
      sendMessage(user, "get_waiting_battles");
      // Add a small delay to show the loading state
      setTimeout(() => setIsRefreshing(false), 500);
      
      if (showNotification) {
        // You could add a toast notification here if you have a notification system
        console.log("Waiting battles refreshed");
      }
    }
  }

  // Refresh battles when component mounts
  useEffect(() => {
    refreshWaitingBattles();
  }, []);

  // Refresh battles when user navigates to this page
  useEffect(() => {
    refreshWaitingBattles();
  }, [location.pathname]);

  // Refresh battles when user changes
  useEffect(() => {
    if (user.username) {
      refreshWaitingBattles();
    }
  }, [user.username]);

  // Refresh battles when user returns to the browser tab
  useEffect(() => {
    const handleFocus = () => {
      refreshWaitingBattles();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user.username]);
  
  const handleCreateBattle = async () => {
    // Defensive: Only allow creation if not already in a waiting battle
    const userActiveBattle = battle.find(b => b.first_opponent === user.username && b.second_opponent === '');
    if (userActiveBattle) {
      setCreationError("You already have an active battle waiting. Please wait for someone to join or cancel it first.");
      return;
    }
    // Clear previous errors and success states
    setCreationError(null);
    setCreationSuccess(false);
    
    // Validate inputs
    if (!selectedSport) {
      setCreationError("Please select a sport");
      return;
    }
    
    if (!selectedLevel) {
      setCreationError("Please select a difficulty level");
      return;
    }
    
  
    setIsCreatingBattle(true);
    setIsBattleBeingCreated(true);
    
    timeoutRef.current = setTimeout(() => {
      if (isBattleBeingCreated) {
        setCreationError("Battle creation is taking longer than expected. The battle may have been created successfully. Please check the waiting battles list or try again.");
        setIsCreatingBattle(false);
        setIsBattleBeingCreated(false);
      }
    }, 10000); // 10 second timeout
    
    try {
      // Send battle creation request
      const messageSent = notifyBattleCreated(user.username, selectedSport, selectedLevel);
      
      if (!messageSent) {
        throw new Error("Failed to send battle creation message - WebSocket may not be connected");
      }
      
      // Don't show success message or reset form here
      // Wait for the backend response which will trigger navigation
      
    } catch (error) {
      clearTimeout(timeoutRef.current);
      setCreationError("Failed to create battle. Please try again.");
      console.error("Battle creation error:", error);
      setIsCreatingBattle(false);
      setIsBattleBeingCreated(false);
    }
  }

  const handleJoinBattle = async (battle_id: string) => {
    // Defensive: Never call notifyBattleCreated here, only joinBattle
    if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
      reconnectWebSocket();
      setTimeout(() => {
        joinBattle(user.username, battle_id);
      }, 1000);
    } else {
      joinBattle(user.username, battle_id);
    }
  }

  const handleCancelBattle = async (battle_id: string) => {
    if (confirm("Are you sure you want to cancel this battle?")) {
      try {
        cancelBattle(battle_id, user.username);
        // The battle will be removed from the list when the backend processes the cancellation
      } catch (error) {
        console.error("Error canceling battle:", error);
        alert("Failed to cancel battle. Please try again.");
      }
    }
  }

  // Reset form when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setSelectedSport('');
      setSelectedLevel('');
      setCreationError(null);
      setCreationSuccess(false);
      setIsCreatingBattle(false);
      setIsBattleBeingCreated(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset form when user changes
  useEffect(() => {
    setSelectedSport('');
    setSelectedLevel('');
    setCreationError(null);
    setCreationSuccess(false);
    setIsCreatingBattle(false);
    setIsBattleBeingCreated(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [user.username]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-orange-500" />
                Create New Battle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {isBattleBeingCreated && !creationSuccess && (
                  <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                    Creating your battle... Please wait while we set up your challenge.
                  </div>
                )}

                {/* Error Message */}
                {creationError && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {creationError}
                    {creationError.includes("WebSocket may not be connected") && (
                      <div className="mt-2">
                        <Button 
                          onClick={() => window.location.reload()}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reconnect (Refresh Page)
                        </Button>
                      </div>
                    )}
                    {creationError.includes("taking longer than expected") && (
                      <div className="mt-2 flex gap-2">
                        <Button 
                          onClick={handleCreateBattle}
                          disabled={isCreatingBattle}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isCreatingBattle ? "Creating..." : "Retry Battle Creation"}
                        </Button>
                        <Button 
                          onClick={() => refreshWaitingBattles(true)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Check Waiting Battles
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="sport">Select Sport</Label>
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger className={!selectedSport ? "border-red-300" : ""}>
                      <SelectValue placeholder="Choose sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="cricket">Cricket</SelectItem>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="hockey">Hockey</SelectItem>
                      <SelectItem value="volleyball">Volleyball</SelectItem>
                      <SelectItem value="rugby">Rugby</SelectItem>
                      <SelectItem value="golf">Golf</SelectItem>
                      <SelectItem value="boxing">Boxing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="level">Battle Level</Label>
                  <Select
                    value={selectedLevel.toString()}
                    onValueChange={(value) => setSelectedLevel(value)}
                  >
                    <SelectTrigger className={!selectedLevel ? "border-red-300" : ""}>
                      <SelectValue placeholder="Choose level" />
                    </SelectTrigger>
                    <SelectContent defaultValue="1">
                      <SelectItem value="easy">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span>Easy</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span>Medium</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="hard">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span>Hard</span>
                        </div>
                      </SelectItem>      
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCreateBattle}
                  disabled={!selectedSport || !selectedLevel || isCreatingBattle}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isCreatingBattle ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Battle...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Create Battle
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg sm:text-xl">Waiting Battles</CardTitle>
                  <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {battle.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshWaitingBattles(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  {isRefreshing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                  <span className="sm:hidden">{isRefreshing ? "..." : "Refresh"}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {battle.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">No waiting battles</p>
                  <p className="text-sm">Create a new battle or wait for others to join</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4">
                  {battle.map((battle_data) => {
                    const isUserBattle = battle_data.first_opponent === user.username;
                    return (
                      <div
                        key={battle_data.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg shadow gap-3 sm:gap-4 ${
                          isUserBattle 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                            : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                            <AvatarImage
                              src={battle_data.creator_avatar ? `https://api.head2head.dev${battle_data.creator_avatar}` : undefined}
                              alt={battle_data.first_opponent}
                            />
                            <AvatarFallback className={`${
                              isUserBattle ? 'bg-orange-500' : 'bg-blue-500'
                            } text-white text-sm sm:text-base`}>
                              {battle_data.first_opponent.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                {battle_data.first_opponent}
                              </h3>
                              {isUserBattle && (
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full w-fit">
                                  Your Battle
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="capitalize">{battle_data.sport}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    battle_data.level === 'easy' ? 'bg-green-500' :
                                    battle_data.level === 'medium' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}></div>
                                  <span className="capitalize">{battle_data.level}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          {isUserBattle ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBattle(battle_data.id)}
                              className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-none text-xs sm:text-sm"
                            >
                              Cancel
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoinBattle(battle_data.id)}
                              className="bg-orange-500 hover:bg-orange-600 flex-1 sm:flex-none text-xs sm:text-sm"
                            >
                              Join Battle
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 