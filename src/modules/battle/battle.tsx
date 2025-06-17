import { useState, useEffect } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { useNavigate } from 'react-router-dom'
import { Play, Clock, Trophy } from 'lucide-react'
import axios from 'axios'
import Header from '../dashboard/header'
import { Avatar, AvatarFallback, AvatarImage } from '../../shared/ui/avatar'

import { Label } from '../../shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'

interface Battle {
  id: string
  opponent: {
    username: string
    avatar: string | null
  }
  sport: string
  duration: string
  status: 'pending' | 'active' | 'completed'
  createdAt: string
}

export default function BattlePage() {
  const { user } = useGlobalStore()
  const [battles, setBattles] = useState<Battle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchBattles()
  }, [])

  const fetchBattles = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/battles/get-battles?username=${user.username}`)
      setBattles(response.data)
    } catch (error) {
      console.error('Error fetching battles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBattle = async () => {
    try {
      const response = await axios.post('http://localhost:8000/battles/create', {
        username: user.username,
        sport: selectedSport,
        duration: selectedDuration
      })
      if (response.data) {
        fetchBattles() // Refresh battles list
      }
    } catch (error) {
      console.error('Error creating battle:', error)
    }
  }

  const handleJoinBattle = async (battleId: string) => {
    try {
      const response = await axios.post(`http://localhost:8000/battles/join`, {
        battleId,
        username: user.username
      })
      if (response.data) {
        navigate(`/battle/${battleId}`)
      }
    } catch (error) {
      console.error('Error joining battle:', error)
    }
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
                      <SelectValue placeholder="Choose a sport" />
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
                  <Label htmlFor="duration">Battle Duration</Label>
                  <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick (5 min)</SelectItem>
                      <SelectItem value="standard">Standard (10 min)</SelectItem>
                      <SelectItem value="extended">Extended (15 min)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreateBattle}
                  disabled={!selectedSport || !selectedDuration}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Create Battle
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Battles Section */}
          <Card>
            <CardHeader>
              <CardTitle>Active Battles</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading battles...</div>
              ) : battles.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No active battles found
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
                          <AvatarImage
                            src={battle.opponent.avatar ? `http://localhost:8000${battle.opponent.avatar}` : undefined}
                            alt={battle.opponent.username}
                          />
                          <AvatarFallback className="bg-orange-500 text-white">
                            {battle.opponent.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {battle.opponent.username}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Trophy className="w-4 h-4" />
                            <span>{battle.sport}</span>
                            <Clock className="w-4 h-4 ml-2" />
                            <span>{battle.duration}</span>
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