import { useState } from 'react'
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
  const [battles] = useState<Battle[]>([])
  const [isLoading] = useState(true)
  const [selectedSport, setSelectedSport] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number>(0)
  const navigate = useNavigate()

  const handleCreateBattle = async () => {
    try {
      const response = await axios.post(`http://localhost:8000/create?first_opponent=${user.username}&sport=${selectedSport}&duration=${selectedDuration}`)
      console.log(response.data)
      navigate(`/waiting/${response.data.id}`)
    } catch (error) {
      console.error('Error creating battle:', error)
    }
  }

  const handleJoinBattle = async (battleId: string) => {
    try {
      const response = await axios.post(`http://localhost:8000/join`, {
        second_opponent: user.username,
        battle_id: battleId
      })
      if (response.data) {
        navigate(`/battle/${battleId}/quiz`)
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
                      <SelectValue placeholder="" />
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
                  <Label htmlFor="duration">Battle Duration (minutes)</Label>
                  <Select
                    value={selectedDuration.toString()}
                    onValueChange={(value) => setSelectedDuration(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose duration" />
                    </SelectTrigger>
                    <SelectContent defaultValue="1">
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="3">3 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>      
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
                {/* Dev: Go to Quiz Page */}
                <Button 
                  onClick={() => navigate('/battle/dev-quiz/quiz')}
                  className="bg-blue-500 hover:bg-blue-600 mt-2"
                >
                  Go to Quiz (Dev)
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