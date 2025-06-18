import type { User } from "../interface/user"
import { newSocket } from "../../app/App"

export const sendMessage = (user: User, type: string) => {
      if(type === "user_update"){
        newSocket?.send(JSON.stringify({
          type: "user_update",
          username: user.username,
          email: user.email,
          totalBattle: user.totalBattles,
          winRate: user.winRate,
          ranking: user.rank,
          winBattle: user.wins,
          favourite: user.favoritesSport,
          streak: user.streak,
          password: user.password,
          friends: user.friends,
          friendRequests: user.friendRequests,
          avatar: user.avatar,
          invitations: user.invitations,
          battles: user.battles,
        }))
      }
      else if(type === "get_email"){
        const user = localStorage.getItem("user")?.replace(/"/g, '')
        if(user){
          newSocket?.send(JSON.stringify({
            type: "get_email",
            email: user
          }))
        }
      }
}

export const acceptFriendRequest = (user: User, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "accept_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}

export const rejectFriendRequest = (user: User, friend_username: string) => { 
  newSocket?.send(JSON.stringify({
    type: "reject_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}

export const sendFriendRequest = (user: string, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "send_friend_request",
    username: user,
    friend_username: friend_username
  }))
}

export const cancelFriendRequest = (user: User, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "cancel_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}

export const invitebattleFriend = (friend_username: string, battle_id: string) => {
  newSocket?.send(JSON.stringify({
    type: "invite_friend",
    friend_username: friend_username,
    battle_id: battle_id
  }))
}

export const cancelInvitation = (friend_username: string, battle_id: string) => {
        newSocket?.send(JSON.stringify({
          type: "cancel_invitation",
          friend_username: friend_username,
          battle_id: battle_id
        }))
}

export const acceptInvitation = (friend_username: string, battle_id: string) => {
          newSocket?.send(JSON.stringify({
          type: "accept_invitation",
          friend_username: friend_username,
          battle_id: battle_id
        }))
}

export const removeFriend = (user: User, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "remove_friend",
    username: user.username,
    friend_username: friend_username
  }))
}