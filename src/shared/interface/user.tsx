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
    avatar?: string;
    battles: string[];
    invitations: string[];
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
    avatar: "/placeholder.svg?height=100&width=100",
    rank: 1,
    winRate: 0,
    totalBattles: 0,
    wins: 0,
    streak: 0,
    favoritesSport: "Football",
    password: "",
    friends: [],
    friendRequests: [],
    battles: [],
    invitations: [],
  }

export interface RecentBattle {
    id: number,
    opponent: string,
    player1: string,
    player2: string,
    sport: string,
    result: string,
    score: string,
    time: string,
}

export interface Friend {
    username: string,
    status: string,
    avatar: string | null,
    rank: string,
}