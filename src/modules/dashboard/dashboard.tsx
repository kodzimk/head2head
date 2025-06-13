import { useState, useEffect } from "react";
import { Button } from "../../shared/ui/button";
import { Card, CardContent } from "../../shared/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../shared/ui/tabs";
import {
  Users,
  Crown,
  Target,
  Play,
  Sword,
  FlameIcon as Fire,
  Camera,
} from "lucide-react";

import Overview from "./tabs/overview";
import Battles from "./tabs/battles";
import Friends from "./tabs/friends";
import Header from "./header";
import type { RecentBattle, Friend } from "../../shared/interface/user";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    document.title = "Dashboard";
  }, []);

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
  };

  const recentBattles: RecentBattle[] = [];

  const friends: Friend[] = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-[25px] md:text-3xl font-bold text-gray-900">
                Welcome back, {user.username}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Ready to dominate the sports trivia world?
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                <Play className="w-4 h-4 mr-2" />
                Quick Battle
              </Button>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Users className="w-4 h-4 mr-2" />
                Challenge Friends
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="hidden xl:grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 md:hidden lg:block">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm py-2">Current Rank</p>
                  <p className="text-2xl font-bold">{user.rank}</p>
                </div>
                <Crown className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 md:hidden lg:block">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm py-2">Win Rate</p>
                  <p className="text-2xl font-bold">{user.winRate}%</p>
                </div>
                <Target className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 md:hidden lg:block">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm py-2">Win Streak</p>
                  <p className="text-2xl font-bold">{user.streak}</p>
                </div>
                <Fire className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 md:hidden lg:block">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm py-2">Total Battles</p>
                  <p className="text-2xl font-bold">{user.totalBattles}</p>
                </div>
                <Sword className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
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
  );
}
