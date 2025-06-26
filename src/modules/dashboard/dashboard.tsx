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
} from "lucide-react";

import Overview from "./tabs/overview";
import Battles from "./tabs/battles";
import Friends from "./tabs/friends";
import Header from "./header";
import type { RecentBattle } from "../../shared/interface/user";
import { useGlobalStore, API_BASE_URL } from "../../shared/interface/gloabL_var";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const {user, setUser} = useGlobalStore()
  const [recentBattles, setRecentBattles] = useState<RecentBattle[]>([]);

  useEffect(() => {
    document.title = "Dashboard";
  }, []);

  useEffect(() => {
    const fetchBattles = async () => {
      if (!localStorage.getItem("username")) return;
      const response = await axios.get(
        `${API_BASE_URL}/battle/get_recent_battles?username=${localStorage.getItem("username")}&limit=4`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const data = await response.data;
      const mapped: RecentBattle[] = data.map((battle: any) => {
        let opponent = battle.first_opponent === user.username ? battle.second_opponent : battle.first_opponent;
        let result = "draw";
        if (battle.first_opponent === user.username) {
          result = battle.first_opponent_score > battle.second_opponent_score ? "win" : (battle.first_opponent_score < battle.second_opponent_score ? "lose" : "draw");
        } else if (battle.second_opponent === user.username) {
          result = battle.second_opponent_score > battle.first_opponent_score ? "win" : (battle.second_opponent_score < battle.first_opponent_score ? "lose" : "draw");
        }
        const score = `${battle.first_opponent_score} : ${battle.second_opponent_score}`;
        
        return {
          id: battle.id,
          opponent: opponent || "Unknown",
          player1: battle.first_opponent,
          player2: battle.second_opponent,
          sport: battle.sport,
          result,
          score,
        };
      });
      setRecentBattles(mapped);
    };
    fetchBattles();
    
    // Listen for battle finished events to refresh data
    const handleBattleFinished = (event: any) => {
      console.log('[Dashboard] Battle finished event received:', event.detail);
      console.log('[Dashboard] Refreshing battle data...');
      
      // Update user stats if provided in the event
      if (event.detail.updated_users && event.detail.updated_users[user.username]) {
        const updatedStats = event.detail.updated_users[user.username];
        console.log('[Dashboard] Updating user stats:', updatedStats);
        
        // Update the global user store with new stats (use new object, correct mapping)
        const updatedUser = {
          ...user,
          totalBattles: updatedStats.totalBattle,
          wins: updatedStats.winBattle,
          winRate: updatedStats.winRate,
          streak: updatedStats.streak,
        };
        setUser(updatedUser);
        // Update localStorage if needed
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      fetchBattles();
    };
    
    window.addEventListener('battleFinished', handleBattleFinished);
    
    return () => {
      window.removeEventListener('battleFinished', handleBattleFinished);
    };
  }, [user, setUser]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl"> 
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-[25px] md:text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user.username}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Ready to dominate the sports trivia world?
              </p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white dark:from-orange-600 dark:to-red-600 dark:hover:from-orange-700 dark:hover:to-red-700" onClick={() => navigate("/battles")}>
                <Play className="w-4 h-4 mr-2" />
                Quick Battle
              </Button>
              <Button
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-500 dark:text-orange-400 dark:hover:bg-orange-900/20"
                onClick={() => navigate("/battles")}
              >
                <Users className="w-4 h-4 mr-2" />
                Challenge Friends
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden xl:grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 md:hidden lg:block dark:from-orange-600 dark:to-red-600 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 dark:text-orange-200 text-sm py-2">Current Rank</p>
                  <p className="text-2xl font-bold">{user.rank}</p>
                </div>
                <Crown className="w-8 h-8 text-orange-200 dark:text-orange-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 md:hidden lg:block dark:from-green-600 dark:to-emerald-600 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 dark:text-green-200 text-sm py-2">Win Rate</p>
                  <p className="text-2xl font-bold">{user.winRate}%</p>
                </div>
                <Target className="w-8 h-8 text-green-200 dark:text-green-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 md:hidden lg:block dark:from-blue-600 dark:to-cyan-600 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 dark:text-blue-200 text-sm py-2">Win Streak</p>
                  <p className="text-2xl font-bold">{user.streak}</p>
                </div>
                <Fire className="w-8 h-8 text-blue-200 dark:text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0 md:hidden lg:block dark:from-purple-600 dark:to-pink-600 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 dark:text-purple-200 text-sm py-2">Total Battles</p>
                  <p className="text-2xl font-bold">{user.totalBattles}</p>
                </div>
                <Sword className="w-8 h-8 text-purple-200 dark:text-purple-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">Overview</TabsTrigger>
            <TabsTrigger value="battles" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">Battles</TabsTrigger>
            <TabsTrigger value="friends" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400">Friends</TabsTrigger>
          </TabsList>

          <Overview user={user} recentBattles={recentBattles} />

          <Battles user={user} />

          <Friends user={user}/>
        </Tabs>
      </main>
    </div>
  );
}
