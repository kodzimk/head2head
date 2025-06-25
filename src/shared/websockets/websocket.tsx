import type { User } from "../interface/user"
import { newSocket } from "../../app/App"

export const checkWebSocketConnection = () => {
  if (!newSocket) {
    console.error("WebSocket is not initialized");
    return false;
  }
  
  if (newSocket.readyState !== WebSocket.OPEN) {
    console.error("WebSocket is not open. Current state:", newSocket.readyState);
    return false;
  }
  
  return true;
};

export const sendMessage = (user: User, type: string) => {
      if (!checkWebSocketConnection()) {
        console.error("Cannot send message - WebSocket not connected");
        return false;
      }
      
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
      else if(type === "get_waiting_battles"){
         
        newSocket?.send(JSON.stringify({
          type: "get_waiting_battles",
          username: user.username
        }))
      }
      
      return true;
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
  if (!newSocket || newSocket.readyState !== WebSocket.OPEN) {
    setTimeout(() => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.send(JSON.stringify({
          type: "start_battle",
          battle_id: battle_id
        }));
      } 
    }, 1000);
    return;
  }
    
  newSocket.send(JSON.stringify({
    type: "start_battle",
    battle_id: battle_id
  }));
}

export const removeFriend = (user: User, friend_username: string) => {
  newSocket?.send(JSON.stringify({
    type: "remove_friend",
    username: user.username,
    friend_username: friend_username
  }))
}

export const deleteUser = () => {
  const token = localStorage.getItem("access_token")?.replace(/"/g, '')
  if (token) {
    newSocket?.send(JSON.stringify({
      type: "delete_user",
      token: token
    }))
  } else {
    console.error("No access token found in localStorage for account deletion.")
  }
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


export const notifyBattleCreated = ( first_opponent: string, sport: string, level: string) => {
  console.log("Attempting to send battle creation message..."); // Debug log
  
  if (!checkWebSocketConnection()) {
    return false;
  }
  
  const message = {
    type: "notify_battle_created",
    first_opponent: first_opponent,
    sport: sport,
    level: level
  };
  
  console.log("Sending battle creation message:", message); // Debug log
  
  try {
    if (newSocket) {
      newSocket.send(JSON.stringify(message));
      console.log("Battle creation message sent successfully"); // Debug log
      return true;
    } else {
      console.error("WebSocket is null after connection check");
      return false;
    }
  } catch (error) {
    console.error("Error sending battle creation message:", error);
    return false;
  }
}

export const notifyBattleStarted = (battle_id: string) => {
  newSocket?.send(JSON.stringify({
    type: "notify_battle_started",
    battle_id: battle_id
  }))
}

export const cancelBattle = (battle_id: string, username: string) => {
  newSocket?.send(JSON.stringify({
    type: "cancel_battle",
    battle_id: battle_id,
    username: username
  }))
}

// Test function to verify WebSocket connectivity
export const testWebSocketConnection = () => {
  if (!checkWebSocketConnection()) {
    console.error("WebSocket connection test failed - not connected");
    return false;
  }
  
  console.log("WebSocket connection test - sending test message");
  newSocket?.send(JSON.stringify({
    type: "test_connection",
    timestamp: Date.now()
  }));
  return true;
}