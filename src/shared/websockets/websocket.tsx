import type { User } from "../interface/user"

export const websocket = new WebSocket("ws://127.0.0.1:8000/ws")


export const sendMessage = (user: User,type: string) => {
    console.log("Sending message")

if(type === "user_update"){
      websocket.send(JSON.stringify({
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
        avatar: user.avatar
      }))
}
else if(type === "get_email"){
  const user = localStorage.getItem("user")?.replace(/"/g, '')
  if(user){
  websocket.send(JSON.stringify({
    type: "get_email",
    email: user
  }))
  }
 }
} 

export const acceptFriendRequest = (user: User, friend_username: string) => {
  websocket.send(JSON.stringify({
    type: "accept_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}

export const rejectFriendRequest = (user: User, friend_username: string) => { 
  websocket.send(JSON.stringify({
    type: "reject_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}

export const sendFriendRequest = (user: string, friend_username: string) => {
  websocket.send(JSON.stringify({
    type: "send_friend_request",
    username: user,
    friend_username: friend_username
  }))
}

export const cancelFriendRequest = (user: User, friend_username: string) => {
  websocket.send(JSON.stringify({
    type: "cancel_friend_request",
    username: user.username,
    friend_username: friend_username
  }))
}