import { useState } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { Play, Clock, Trophy } from 'lucide-react'
import Header from '../dashboard/header'
import { Avatar, AvatarFallback } from '../../shared/ui/avatar'
import { joinBattle, notifyBattleCreated } from '../../shared/websockets/websocket'
import { newSocket, reconnectWebSocket } from '../../app/App'
import { Label } from '../../shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'
import { useBattleStore } from '../../shared/interface/gloabL_var'



export default function BattlePage() {
  const { user } = useGlobalStore()
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const { battle } = useBattleStore()

  const handleCreateBattle = async () => {
      notifyBattleCreated(user.username, selectedSport, selectedLevel)
  }

  const handleJoinBattle = async (battle_id: string) => {
    if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
      reconnectWebSocket();
      setTimeout(() => {
        joinBattle(user.username, battle_id);
      }, 1000);
    } else {  
      joinBattle(user.username, battle_id);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Battle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sport">Select Sport</Label>
                  <Select value={selectedSport} onValueChange={setSelectedSport}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose sport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="tennis">Tennis</SelectItem>
                      <SelectItem value="cricket">Cricket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="duration">Battle Level</Label>
                  <Select
                    value={selectedLevel.toString()}
                    onValueChange={(value) => setSelectedLevel(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose level" />
                    </SelectTrigger>
                    <SelectContent defaultValue="1">
                      <SelectItem value="easy">easy</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="hard">hard</SelectItem>      
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateBattle}
                  disabled={!selectedSport || !selectedLevel}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Create Battle
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Waiting Battles</CardTitle>
            </CardHeader>
            <CardContent>
              {battle.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No waiting battles found
                </div>
              ) : (
                <div className="grid gap-4">
                  {battle.map((battle_data) => (
                    <div
                      key={battle_data.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-500 text-white">
                            {battle_data.first_opponent.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {battle_data.first_opponent}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Trophy className="w-4 h-4" />
                            <span>{battle_data.sport}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{battle_data.level}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinBattle(battle_data.id)}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        Join Battle
                      </Button>
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