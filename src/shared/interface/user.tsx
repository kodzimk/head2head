export interface User {
    username: string;
    avatar: string;
    level: number;
    xp: number;
    xpToNext: number;
    wins: number;
    favoritesSport: string;
    rank: string;
    winRate: number;
    totalBattles: number;
    streak: number;
}

export interface RecentBattle {
    id: number,
    opponent: string,
    sport: string,
    result: string,
    score: string,
    time: string,
}

export interface Friend {
    id: number,
    username: string,
    status: string,
    avatar: string,
    rank: string,
}