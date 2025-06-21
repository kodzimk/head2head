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
        const token = localStorage.getItem("access_token")?.replace(/"/g, '')
        if(token){
          newSocket?.send(JSON.stringify({
            type: "get_email",
            token: token
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

export const joinBattle = (username: string, battle_id: string) => {
  newSocket?.send(JSON.stringify({
    type: "join_battle",
    username: username,
    battle_id: battle_id
  }))
}

export const startBattle = (battle_id: string) => {
  console.log("startBattle called with battle_id:", battle_id);
  
  if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected, cannot start battle");
    // Retry after a short delay
    setTimeout(() => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        console.log("Retrying startBattle...");
        newSocket.send(JSON.stringify({
          type: "start_battle",
          battle_id: battle_id
        }));
      } else {
        console.error("WebSocket still not connected after retry");
      }
    }, 1000);
    return;
  }
  
  newSocket.send(JSON.stringify({
    type: "start_battle",
    battle_id: battle_id
  }));
  console.log("startBattle message sent");
}

export const notifyBattleCreated = (battle_id: string, first_opponent: string, sport: string, level: string) => {
  console.log("notifyBattleCreated called with:", { battle_id, first_opponent, sport, level })
  if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected, cannot send battle_created notification")
    return
  }
  newSocket.send(JSON.stringify({
    type: "notify_battle_created",
    battle_id: battle_id,
    first_opponent: first_opponent,
    sport: sport,
    level: level
  }))
  console.log("notifyBattleCreated message sent")
}

export const notifyBattleDeleted = (battle_id: string) => {
  console.log("notifyBattleDeleted called with battle_id:", battle_id)
  if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket not connected, cannot send battle_deleted notification")
    return
  }
  newSocket.send(JSON.stringify({
    type: "notify_battle_deleted",
    battle_id: battle_id
  }))
  console.log("notifyBattleDeleted message sent")
}

export const removeFriend = (user: User, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "remove_friend",
    username: user.username,
    friend_username: friend_username
  }))
}

export const deleteUser = (user: User) => {
  newSocket?.send(JSON.stringify({
    type: "delete_user",
    email: user.email
  }))
}

export const submitAnswer = (battle_id: string, answer: string, username: string) => {
  newSocket?.send(JSON.stringify({
    type: "submit_answer",
    battle_id: battle_id,
    answer: answer,
    username: username,
  }))
}

export const checkForWinner = (battle_id: string) => {
  newSocket?.send(JSON.stringify({
    type: "check_for_winner",
    battle_id: battle_id
  }))
}

export const battleResult = (battle_id: string, winner: string, loser: string,result:string) => {
  newSocket?.send(JSON.stringify({
    type: "battle_result",
    battle_id: battle_id,
    winner: winner,
    loser: loser,
    result: result
  }))
}

export const battleDrawResult = (battle_id: string) => {
  newSocket?.send(JSON.stringify({
    type: "battle_draw_result",
    battle_id: battle_id
  }))
}
