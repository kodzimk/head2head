import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { useNavigate } from 'react-router-dom'
import { Play, Clock, Trophy, RefreshCw } from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import { Avatar, AvatarFallback } from '../../shared/ui/avatar'
import { joinBattle } from '../../shared/websockets/websocket'
import { Label } from '../../shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'
interface Battle {
  id: string
  first_opponent: string
  sport: string
  level: string
  created_at: string
}

export default function BattlePage() {
  const { user } = useGlobalStore()
  const [battles, setBattles] = useState<Battle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchWaitingBattles()
  }, [])

  const fetchWaitingBattles = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get('http://localhost:8000/get_waiting_battles')
      setBattles(response.data)
    } catch (error) {
      console.error('Error fetching waiting battles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBattle = async () => {
    try {
      const response = await axios.post(`http://localhost:8000/create?first_opponent=${user.username}&sport=${selectedSport}&level=${selectedLevel}`)
      console.log(response.data)
      navigate(`/waiting/${response.data.id}`)
    } catch (error) {
      console.error('Error creating battle:', error)
    }
  }

  const handleJoinBattle = async (battle_id: string) => {
      joinBattle(user.username, battle_id)
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Create Battle Section */}
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

          {/* Waiting Battles Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Waiting Battles</CardTitle>
                <Button
                  onClick={fetchWaitingBattles}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading battles...</div>
              ) : battles.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No waiting battles found
                </div>
              ) : (
                <div className="grid gap-4">
                  {battles.map((battle) => (
                    <div
                      key={battle.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-orange-500 text-white">
                            {battle.first_opponent.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {battle.first_opponent}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Trophy className="w-4 h-4" />
                            <span>{battle.sport}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{battle.level}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleJoinBattle(battle.id)}
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