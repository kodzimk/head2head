import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../shared/ui/card';
import { Button } from '../../shared/ui/button';

// For now, use mock data. Replace with props or state as needed.
const mockResult = {
  winner: {
    username: 'Alice',
    score: 8,
    isOwner: true,
  },
  loser: {
    username: 'Bob',
    score: 5,
    isOwner: false,
  },
};

export default function BattleResultPage() {
  const { winner, loser } = mockResult;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold mb-2">
            {winner.username} is the Winner! 🏆
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <div className="w-full flex justify-between items-center">
              <div className="text-center flex-1">
                <div className="text-lg font-semibold text-gray-700">{winner.username}</div>
                <div className="text-2xl font-bold text-green-600">{winner.score}</div>
                <div className="mt-1 text-xs text-blue-500 font-semibold">{winner.isOwner ? 'Owner' : 'Opponent'}</div>
                <div className="mt-2 text-green-500 font-bold">Winner</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-lg font-semibold text-gray-700">{loser.username}</div>
                <div className="text-2xl font-bold text-red-600">{loser.score}</div>
                <div className="mt-1 text-xs text-blue-500 font-semibold">{loser.isOwner ? 'Owner' : 'Opponent'}</div>
                <div className="mt-2 text-red-500 font-bold">Loser</div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <div className="text-xl font-semibold text-gray-800 mb-2">
                {winner.username} becomes the Owner of the Battle!
              </div>
              <Button className="mt-2 bg-orange-500 hover:bg-orange-600 w-full">Back to Dashboard</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 