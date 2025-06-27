import { useState } from 'react'
import { Button } from '../../shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../shared/ui/select'
import { Alert, AlertDescription } from '../../shared/ui/alert'
import { Label } from '../../shared/ui/label'
import { AlertTriangle, RefreshCw, Trash2, Target, Trophy, Zap, Users } from 'lucide-react'
import Header from './header'
import { useGlobalStore } from '../../shared/interface/gloabL_var'
import { API_BASE_URL } from '../../shared/interface/gloabL_var'
import axios from 'axios'

export default function AdminPanel() {
  const { user } = useGlobalStore()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetType, setResetType] = useState('all')
  const [showResetSection, setShowResetSection] = useState(false)

  const handleResetAllUsersStats = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true)
      return
    }

    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/db/reset-all-users-stats?reset_type=${resetType}`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data) {
        setMessage(`Successfully reset ${resetType} statistics for ${response.data.users_reset} users!`)
        setMessageType('success')
        
        // Reset confirmation state
        setShowResetConfirm(false)
        setShowResetSection(false)
        
        // Clear message after 10 seconds
        setTimeout(() => {
          setMessage('')
        }, 10000)
      }
    } catch (error: any) {
      console.error('Error resetting all users statistics:', error)
      setMessage(error.response?.data?.detail || 'Failed to reset all users statistics')
      setMessageType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const getResetTypeDescription = (type: string) => {
    switch (type) {
      case 'all':
        return 'Reset all battle statistics, ranking, and streak for all users'
      case 'battles':
        return 'Reset only battle-related statistics (wins, total battles, win rate, streak) for all users'
      case 'ranking':
        return 'Reset only ranking position for all users'
      case 'streak':
        return 'Reset only current winning streak for all users'
      default:
        return ''
    }
  }

  const getResetTypeIcon = (type: string) => {
    switch (type) {
      case 'all':
        return <Trash2 className="w-4 h-4" />
      case 'battles':
        return <Target className="w-4 h-4" />
      case 'ranking':
        return <Trophy className="w-4 h-4" />
      case 'streak':
        return <Zap className="w-4 h-4" />
      default:
        return <RefreshCw className="w-4 h-4" />
    }
  }

  // Check if user is admin (you can implement your own admin check logic)
  const isAdmin = user.username === 'admin' || user.email.includes('admin')

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Header user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Access Denied</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to access the admin panel.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Admin Panel</h1>
          
          {message && (
            <Alert className={`mb-6 ${messageType === 'error' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : messageType === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-green-500 bg-green-50 dark:bg-green-900/20'}`}>
              <AlertDescription className={messageType === 'error' ? 'text-red-700 dark:text-red-300' : messageType === 'warning' ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Total Users</Label>
                    <p className="text-2xl font-bold">{user.totalBattles || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Active Battles</Label>
                    <p className="text-2xl font-bold text-green-600">{user.wins || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Admin Panel for managing user statistics and system operations.</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => setShowResetSection(true)}
                  className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Reset All Users Statistics
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate Rankings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Reset All Users Statistics Section */}
          {showResetSection && (
            <Card className="mt-6 border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-5 h-5" />
                  Reset All Users Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <AlertDescription className="text-red-700 dark:text-red-300">
                      <strong>DANGER:</strong> This action will permanently reset statistics for ALL users and cannot be undone. This is an irreversible operation.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label htmlFor="resetType">Reset Type</Label>
                    <Select value={resetType} onValueChange={setResetType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reset type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            {getResetTypeIcon('all')}
                            <span>All Statistics</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="battles">
                          <div className="flex items-center gap-2">
                            {getResetTypeIcon('battles')}
                            <span>Battle Statistics</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ranking">
                          <div className="flex items-center gap-2">
                            {getResetTypeIcon('ranking')}
                            <span>Ranking Only</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="streak">
                          <div className="flex items-center gap-2">
                            {getResetTypeIcon('streak')}
                            <span>Streak Only</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-2">
                      {getResetTypeDescription(resetType)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleResetAllUsersStats}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Resetting All Users...
                        </>
                      ) : showResetConfirm ? (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Confirm Reset All Users
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 mr-2" />
                          Reset All Users Statistics
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowResetSection(false)
                        setShowResetConfirm(false)
                        setResetType('all')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
} 