import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { Play, Clock, Trophy, RefreshCw, Undo, UserPlus, AlertCircle } from 'lucide-react'
import Header from '../dashboard/header'
import { joinBattle, sendMessage, cancelBattle } from '../../shared/websockets/websocket'
import { newSocket, reconnectWebSocket } from '../../app/App'
import { Label } from '../../shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'
import { useBattleStore } from '../../shared/interface/gloabL_var'
import { useLocation, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from "../../shared/interface/gloabL_var"
import axios from 'axios'
import { Badge } from '../../shared/ui/badge'
import AvatarStorage from '../../shared/utils/avatar-storage'
import { UserAvatar } from '../../shared/ui/user-avatar'
import { useTranslation } from 'react-i18next'

export default function BattlePage() {
  const { user } = useGlobalStore()
  const { t } = useTranslation()
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
  const navigate = useNavigate()
  const [refreshMessage] = useState<string | null>(null)

  // Add debounced avatar fetching
  const debouncedFetchAndCacheAvatars = useCallback(async () => {
    if (battle.length === 0) return;

    // Create a Set to track unique usernames and avoid duplicate fetches
    const uniqueUsers = new Set<string>();
    battle.forEach(battleData => {
      if (battleData.first_opponent) {
        uniqueUsers.add(battleData.first_opponent);
      }
    });

    // Process unique avatars in batches
    const batchSize = 3;
    const usernames = Array.from(uniqueUsers);
    
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (username) => {
        const persistentAvatar = await AvatarStorage.getAvatar(username);
        const battleData = battle.find(b => b.first_opponent === username);
        
        if (persistentAvatar === null && battleData?.creator_avatar) {
          try {
            const fullAvatarUrl = battleData.creator_avatar.startsWith('http') 
              ? battleData.creator_avatar 
              : `${API_BASE_URL}${battleData.creator_avatar}`;
            
            const response = await fetch(fullAvatarUrl);
            if (response.ok) {
              const blob = await response.blob();
              const file = new File([blob], 'avatar.jpg', { type: blob.type });
              await AvatarStorage.saveAvatar(username, file);
            }
          } catch (error) {
            console.warn('[Battle] Failed to cache avatar for', username, ':', error);
          }
        }
      }));
      
      // Add delay between batches
      if (i + batchSize < usernames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [battle]);

  useEffect(() => {
    // Debounce the avatar fetching to avoid too frequent updates
    const timeoutId = setTimeout(() => {
      debouncedFetchAndCacheAvatars();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [debouncedFetchAndCacheAvatars]);

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
  
  // Listen for battle not found events to refresh the list
  useEffect(() => {
    const handleRefreshWaitingBattles = () => {
      console.log('Received refreshWaitingBattles event, refreshing list');
      refreshWaitingBattles();
    };

    window.addEventListener('refreshWaitingBattles', handleRefreshWaitingBattles);
    return () => {
      window.removeEventListener('refreshWaitingBattles', handleRefreshWaitingBattles);
    };
  }, [user.username]);

  // Refresh battles when user returns from a completed battle
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, refreshing waiting battles');
        refreshWaitingBattles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user.username]);

  // Refresh battles when navigating to this page
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/battles') {
        console.log('Navigated to battles page, refreshing waiting battles');
        refreshWaitingBattles();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user.username]);
  
  const handleCreateBattle = async () => {
    // Allow multiple battles but with reasonable limits
    const userActiveBattles = battle.filter(b => b.first_opponent === user.username && b.second_opponent === '');
    
    // Limit to 3 active waiting battles to prevent spam
    if (userActiveBattles.length >= 3) {
      setCreationError(t('ui.upTo3ActiveBattles'));
      return;
    }
    
    // Check if user already has a battle with the same sport and level
    const duplicateBattle = userActiveBattles.find(b => b.sport === selectedSport && b.level === selectedLevel);
    if (duplicateBattle) {
      setCreationError(`${t('ui.alreadyHaveBattle')} ${selectedSport} (${selectedLevel}) ${t('ui.battleWaiting')}`);
      return;
    }
    
    // Clear previous errors and success states
    setCreationError(null);
    setCreationSuccess(false);
    
    // Validate inputs
    if (!selectedSport) {
      setCreationError(t('ui.pleaseSelectSport'));
      return;
    }
    
    if (!selectedLevel) {
      setCreationError(t('ui.pleaseSelectDifficulty'));
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
    }, 10000);
    
    try {
      // REST API call to create battle
      console.log(`Creating battle via REST API: ${API_BASE_URL}/battle/create?first_opponent=${user.username}&sport=${selectedSport}&level=${selectedLevel}`);
      const response = await axios.post(`${API_BASE_URL}/battle/create?first_opponent=${user.username}&sport=${selectedSport}&level=${selectedLevel}`);
      console.log("Battle creation response:", response.data);
      
      if (response.data && response.data.id) {
        console.log("Battle created successfully, redirecting to waiting room:", response.data.id);
        // Redirect to waiting room for the new battle
        navigate(`/waiting-room/${response.data.id}`);
      } else {
        console.error("Battle creation failed - no battle ID in response");
        setCreationError(t('ui.failedToCreateBattle') + '. ' + t('ui.pleaseTryAgain'));
      }
    } catch (error: any) {
      console.error("Battle creation error:", error);
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.detail || error.response.data?.message || "Server error occurred";
        setCreationError(`${t('ui.failedToCreateBattle')}: ${errorMessage}`);
      } else if (error.request) {
        // Request was made but no response received
        setCreationError("No response from server. Please check your connection and try again.");
      } else {
        // Something else happened
        setCreationError(t('ui.failedToCreateBattle') + '. ' + t('ui.pleaseTryAgain'));
      }
      setIsCreatingBattle(false);
      setIsBattleBeingCreated(false);
    }
  }

  const handleJoinBattle = async (battle_id: string) => {
    console.log(`Attempting to join battle: ${battle_id} as user: ${user.username}`);
    
    // Check WebSocket connection
    if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, attempting to reconnect...");
      reconnectWebSocket();
      setTimeout(() => {
        console.log("Sending join battle message after reconnection");
        joinBattle(user.username, battle_id);
      }, 1000);
    } else {
      console.log("WebSocket connected, sending join battle message");
      joinBattle(user.username, battle_id);
    }
  }

  const handleCancelBattle = async (battle_id: string) => {
    if (confirm("Are you sure you want to cancel this battle?")) {
      try {
        console.log(`Attempting to cancel battle: ${battle_id}`);
        cancelBattle(battle_id, user.username);
        // The battle will be removed from the list when the backend processes the cancellation
      } catch (error) {
        console.error("Error canceling battle:", error);
        alert(t('forum.failedToCancelBattle'));
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

  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'battle_started') {
        console.log('Battle started:', data.data)
        navigate(`/${data.data}/countdown`)
      }
    }

    if (newSocket) {
      newSocket.addEventListener('message', handleWebSocketMessage)
    }

    return () => {
      if (newSocket) {
        newSocket.removeEventListener('message', handleWebSocketMessage)
      }
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-background bg-gaming-pattern">
      <Header />
      <main className="container-gaming py-6 sm:py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-4 sm:space-y-6">
            <h1 className="text-heading-1 text-foreground">
              {t('battles.battleArena')}
            </h1>
          </div>

          {/* Error Display */}
          {creationError && (
            <Card className="card-surface-1 border-destructive/30 bg-destructive/5">
              <CardContent className="responsive-padding">
                <div className="flex items-start gap-3">
                  <div className="text-destructive">⚠️</div>
                  <div>
                    <p className="text-responsive-sm text-destructive font-medium">{t('common.error')}</p>
                    <p className="text-responsive-xs text-muted-foreground mt-1">{creationError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Display */}
          {creationSuccess && (
            <Card className="card-surface-1 border-success/30 bg-success/5">
              <CardContent className="responsive-padding">
                <div className="flex items-start gap-3">
                  <div className="text-success">✅</div>
                  <div>
                    <p className="text-responsive-sm text-success font-medium">{t('common.success')}</p>
                    <p className="text-responsive-xs text-muted-foreground mt-1">{t('ui.battleCreatedSuccessfully')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification */}
          {refreshMessage && (
            <div className="mx-auto max-w-md">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm text-primary">{refreshMessage}</span>
              </div>
            </div>
          )}

          {/* Battle Creation Form */}
          <Card className="card-surface">
            <CardHeader className="responsive-padding">
              <CardTitle className="text-responsive-lg flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                {t('battles.createBattle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="responsive-padding space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Sport Selection */}
                <div className="space-y-2">
                  <Label htmlFor="sport" className="text-responsive-sm font-medium">{t('battles.selectSport')}</Label>
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger className="input-gaming">
                      <SelectValue placeholder={t('battles.selectSport')} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="football">⚽ Football</SelectItem>
                      <SelectItem value="basketball">🏀 Basketball</SelectItem>
                      <SelectItem value="baseball">⚾ Baseball</SelectItem>
                      <SelectItem value="hockey">🏒 Hockey</SelectItem>
                      <SelectItem value="tennis">🎾 Tennis</SelectItem>
                      <SelectItem value="golf">⛳ Golf</SelectItem>
                      <SelectItem value="cricket">🏏 Cricket</SelectItem>
                      <SelectItem value="rugby">🏉 Rugby</SelectItem>
                      <SelectItem value="volleyball">🏐 Volleyball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Difficulty Selection */}
                <div className="space-y-2">
                  <Label htmlFor="level" className="text-responsive-sm font-medium">{t('battles.selectDifficulty')}</Label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="input-gaming">
                      <SelectValue placeholder={t('battles.selectDifficulty')} />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="easy">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-success"></div>
                          {t('battles.easy')}
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-warning"></div>
                          {t('battles.medium')}
                        </div>
                      </SelectItem>
                      <SelectItem value="hard">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-destructive"></div>
                          {t('battles.hard')}
                        </div>
                      </SelectItem>      
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleCreateBattle}
                disabled={isCreatingBattle || !selectedSport || !selectedLevel}
                className="btn-neon w-full sm:w-auto"
                size="lg"
              >
                {isCreatingBattle ? (
                  <div className="flex items-center gap-2">
                    <div className="loading-gaming w-4 h-4 rounded"></div>
                    {t('ui.creatingBattle')}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    {t('battles.createBattle')}
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Waiting Battles Section */}
          <Card className="card-surface">
            <CardHeader className="responsive-padding">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-responsive-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  {t('battles.allBattles')} ({battle.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshWaitingBattles(true)}
                    disabled={isRefreshing}
                    className="border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                  >
                    {isRefreshing ? (
                      <div className="loading-gaming w-4 h-4 rounded mr-2"></div>
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {isRefreshing ? t('ui.refreshing') : t('ui.refreshBattles')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="responsive-padding">
              {battle.length === 0 ? (
                <div className="text-center py-8 sm:py-12 space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted/30 flex items-center justify-center">
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div>
                    <p className="text-responsive-base text-muted-foreground font-medium">{t('ui.noBattlesAvailable')}</p>
                    <p className="text-responsive-xs text-muted-foreground/70 mt-1">{t('ui.createFirstBattleToSee')}</p>
                  </div>
                </div>
              ) : (
                <div className="grid-leaderboard">
                  {battle.map((battle_data: any) => {
                    const isUserBattle = battle_data.first_opponent === user.username;
                    
                    return (
                      <div
                        key={battle_data.id}
                        className={`battle-card ${
                          isUserBattle ? 'battle-card-user' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mb-3 sm:mb-0">
                          <UserAvatar
                            user={{ username: battle_data.first_opponent, avatar: battle_data.creator_avatar }}
                            size="md"
                            variant="faceit"
                            className="leaderboard-avatar"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h3 className="font-semibold text-foreground text-responsive-sm truncate">
                                {battle_data.first_opponent}
                              </h3>
                              {isUserBattle && (
                                <Badge variant="secondary" className="text-xs bg-primary/15 text-primary border-primary/25 w-fit">
                                  Your Battle
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-responsive-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                {battle_data.sport === 'football' && '⚽'}
                                {battle_data.sport === 'basketball' && '🏀'}
                                {battle_data.sport === 'baseball' && '⚾'}
                                {battle_data.sport === 'hockey' && '🏒'}
                                {battle_data.sport === 'tennis' && '🎾'}
                                {battle_data.sport === 'golf' && '⛳'}
                                {battle_data.sport === 'cricket' && '🏏'}
                                {battle_data.sport === 'rugby' && '🏉'}
                                {battle_data.sport === 'volleyball' && '🏐'}
                                <span className="capitalize">{battle_data.sport}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    battle_data.level === 'easy' ? 'bg-success' :
                                    battle_data.level === 'medium' ? 'bg-warning' :
                                    'bg-destructive'
                                  }`}></div>
                                  <span className="capitalize">{battle_data.level}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 sm:gap-3 mt-3 sm:mt-0">
                          {isUserBattle ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelBattle(battle_data.id)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/5"
                            >
                              <Undo className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">{t('ui.cancel')}</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleJoinBattle(battle_data.id)}
                              size="sm"
                              className="btn-neon"
                            >
                              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">{t('ui.join')}</span>
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