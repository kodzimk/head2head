import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/ui/card";
import { Badge } from "../../../shared/ui/badge";
import { TabsContent } from "../../../shared/ui/tabs";
import type { User, RecentBattle } from "../../../shared/interface/user";
import { Button } from "../../../shared/ui/button";
import { ChevronRight } from "lucide-react";
import { Sword } from "lucide-react";

export default function Battles({
  user,
  recentBattles,
}: {
  user: User;
  recentBattles: RecentBattle[];
}) {
  return (
    <div>
      <TabsContent value="battles" className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Battle History
              <Button variant="ghost" size="sm" className="w-32 h-8">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBattles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg mb-4">There are no battles yet</p>
                    <Button variant="outline" className="gap-2">
                      <Sword className="w-4 h-4" />
                      Start Your First Battle
                    </Button>
                  </div>
                ) : (
                  recentBattles.map((battle) => (
                    <div
                      key={battle.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{battle.sport}</div>
                        <div>
                          <p className="font-medium">vs {battle.opponent}</p>
                          <p className="text-sm text-gray-600">{battle.time}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            battle.result === "win" ? "default" : "destructive"
                          }
                          className="mb-2"
                        >
                          {battle.result === "win" ? "Victory" : "Defeat"}
                        </Badge>
                        <p className="text-lg font-bold">{battle.score}</p>
                      </div>
                    </div>
                  ))
                )}
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
                <p className="text-2xl font-bold text-red-600">
                  {user.totalBattles - user.wins}
                </p>
                <p className="text-sm text-gray-600">Total Losses</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {user.streak}
                </p>
                <p className="text-sm text-gray-600">Current Streak</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </div>
  );
}
