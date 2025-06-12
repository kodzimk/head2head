import { useState } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent } from "../../shared/ui/card"
import { Tabs,TabsList, TabsTrigger } from "../../shared/ui/tabs"
import {
  Users,
  Crown,
  Target,
  Play,
  Sword,
  FlameIcon as Fire,
} from "lucide-react"


import Overview from "./tabs/overview"
import Battles from "./tabs/battles"
import Friends from "./tabs/friends"
import Header from "./header"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview")

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
    { id: 1, username: "Mike Sports", avatar: "/placeholder.svg?height=40&width=40", status: "online", rank: "#892" },
    { id: 2, username: "Sarah Trivia", avatar: "/placeholder.svg?height=40&width=40", status: "in-battle", rank: "#1,156" },
    { id: 3, username: "Quiz Master", avatar: "/placeholder.svg?height=40&width=40", status: "offline", rank: "#2,341" },
    { id: 4, username: "Sports Guru", avatar: "/placeholder.svg?height=40&width=40", status: "online", rank: "#567" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.username}! 👋</h1>
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

          <Overview user={user} recentBattles={recentBattles} />

          {/* Battles Tab */}
          <Battles user={user} recentBattles={recentBattles} />
          

          {/* Friends Tab */}
          <Friends friends={friends} />


        </Tabs>
      </main>
    </div>
  )
}
