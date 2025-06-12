"use client"

import { useState } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Badge } from "../../shared/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../../shared/ui/avatar"
import { Progress } from "../../shared/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../shared/ui/tabs"
import {
  Trophy,
  Users,
  Crown,
  Target,
  Settings,
  Play,
  Sword,
  FlameIcon as Fire,
  ChevronRight,
  Plus,
  MessageCircle,
  Share2,
} from "lucide-react"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

  // Mock user data
  const user = {
    name: "Alex Johnson",
    username: "sportsfan_alex",
    avatar: "/placeholder.svg?height=100&width=100",
    level: 42,
    xp: 8750,
    xpToNext: 10000,
    rank: "#1,247",
    winRate: 78,
    totalBattles: 156,
    wins: 122,
    streak: 7,
    favoritesSport: "Football",
  }

  const recentBattles = [
    { id: 1, opponent: "Mike_Sports", sport: "🏈", result: "win", score: "8-6", time: "2 hours ago" },
    { id: 2, opponent: "Sarah_Trivia", sport: "🏀", result: "win", score: "10-7", time: "5 hours ago" },
    { id: 3, opponent: "TriviaKing99", sport: "⚽", result: "loss", score: "5-9", time: "1 day ago" },
    { id: 4, opponent: "QuizMaster", sport: "🏈", result: "win", score: "12-4", time: "2 days ago" },
  ]

  const friends = [
    { id: 1, name: "Mike Sports", avatar: "/placeholder.svg?height=40&width=40", status: "online", rank: "#892" },
    { id: 2, name: "Sarah Trivia", avatar: "/placeholder.svg?height=40&width=40", status: "in-battle", rank: "#1,156" },
    { id: 3, name: "Quiz Master", avatar: "/placeholder.svg?height=40&width=40", status: "offline", rank: "#2,341" },
    { id: 4, name: "Sports Guru", avatar: "/placeholder.svg?height=40&width=40", status: "online", rank: "#567" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="px-2 lg:px-2 h-16 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-orange-200 sticky top-0 z-50">
        
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
            <p className="font-bold text-white">H2H</p>
          </div>
      
        <nav className="ml-auto flex gap-4 items-center">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
            <AvatarFallback>AJ</AvatarFallback>
          </Avatar>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}! 👋</h1>
              <p className="text-gray-600 mt-1">Ready to dominate the sports trivia world?</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                <Play className="w-4 h-4 mr-2" />
                Quick Battle
              </Button>
              <Button variant="outline" className="border-orange-300 text-orange-600 hover:bg-orange-50">
                <Users className="w-4 h-4 mr-2" />
                Challenge Friends
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Current Rank</p>
                  <p className="text-2xl font-bold">{user.rank}</p>
                </div>
                <Crown className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold">{user.winRate}%</p>
                </div>
                <Target className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Win Streak</p>
                  <p className="text-2xl font-bold">{user.streak}</p>
                </div>
                <Fire className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Battles</p>
                  <p className="text-2xl font-bold">{user.totalBattles}</p>
                </div>
                <Sword className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="battles">Battles</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
  
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback>AJ</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold">{user.name}</h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Level {user.level}</span>
                      <span>
                        {user.xp}/{user.xpToNext} XP
                      </span>
                    </div>
                    <Progress value={(user.xp / user.xpToNext) * 100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Battles Won</span>
                      <span className="font-semibold">{user.wins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Favorite Sport</span>
                      <span className="font-semibold">{user.favoritesSport}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Recent Battles
                    <Button variant="ghost" size="sm">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBattles.map((battle) => (
                      <div key={battle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{battle.sport}</div>
                          <div>
                            <p className="font-medium">vs {battle.opponent}</p>
                            <p className="text-sm text-gray-600">{battle.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={battle.result === "win" ? "default" : "destructive"}>
                            {battle.result === "win" ? "Won" : "Lost"}
                          </Badge>
                          <p className="text-sm text-gray-600 mt-1">{battle.score}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Battles Tab */}
          <TabsContent value="battles" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Battle History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBattles.map((battle) => (
                      <div key={battle.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="text-3xl">{battle.sport}</div>
                          <div>
                            <p className="font-medium">vs {battle.opponent}</p>
                            <p className="text-sm text-gray-600">{battle.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={battle.result === "win" ? "default" : "destructive"} className="mb-2">
                            {battle.result === "win" ? "Victory" : "Defeat"}
                          </Badge>
                          <p className="text-lg font-bold">{battle.score}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Battle Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{user.wins}</p>
                    <p className="text-sm text-gray-600">Total Wins</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{user.totalBattles - user.wins}</p>
                    <p className="text-sm text-gray-600">Total Losses</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{user.streak}</p>
                    <p className="text-sm text-gray-600">Current Streak</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Friends ({friends.length})
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Friend
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                            <AvatarFallback>
                              {friend.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-sm text-gray-600">Rank: {friend.rank}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              friend.status === "online"
                                ? "default"
                                : friend.status === "in-battle"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {friend.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Sword className="w-4 h-4 mr-1" />
                            Challenge
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Friend Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Mike Sports</strong> challenged you to a Football battle
                        </p>
                        <p className="text-xs text-gray-600">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Sarah Trivia</strong> won a tournament
                        </p>
                        <p className="text-xs text-gray-600">5 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Share2 className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm">
                          <strong>Quiz Master</strong> shared an achievement
                        </p>
                        <p className="text-xs text-gray-600">1 day ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
