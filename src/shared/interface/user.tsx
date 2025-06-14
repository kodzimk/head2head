export interface User {
    email: string;
    username: string;
    avatar: string;
    wins: number;
    favoritesSport: string;
    rank: number;
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