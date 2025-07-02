export interface User {
    email: string;
    username: string;
    nickname?: string;
    wins: number;
    favoritesSport: string;
    rank: number;
    winRate: number;
    totalBattles: number;
    streak: number;
    password: string;
    friends: string[];
    friendRequests: string[];
    avatar?: string | null;
    battles: RecentBattle[];
    invitations: string[];
    draws?: number;
    losses?: number;
    language?: string;
}

export interface Battle {
    id: string
    first_opponent: string
    sport: string
    level: string
    second_opponent?: string
    created_at?: string
    creator_avatar?: string
}

export const initialUser: User = {
    email: "",
    username: "",
    nickname: "",
    avatar: null,
    rank: 0,
    winRate: 0,
    totalBattles: 0,
    wins: 0,
    streak: 0,
    favoritesSport: "",
    password: "",
    friends: [],
    friendRequests: [],
    battles: [],
    invitations: [],
    draws: 0,
    losses: 0,
}

export interface RecentBattle {
    id: number | string;
    player1: string;
    player2: string;
    sport: string;
    result: 'win' | 'lose' | 'draw';
    score: string;
    time?: string;
}

export interface Friend {
    username: string,
    status: string,
    avatar: string | null,
    rank: string,
}