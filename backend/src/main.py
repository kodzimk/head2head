from auth.router import auth_router
from db.router import db_router
from friends.router import router_friend
from battle.router import battle_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from websocket import app
import os

os.makedirs("avatars", exist_ok=True)
app.mount("/avatars", StaticFiles(directory="avatars"), name="avatars")

app.include_router(auth_router,prefix="/auth",tags=["auth"])
app.include_router(db_router)
app.include_router(router_friend)
app.include_router(battle_router)   

origins = [
    "https://head2head-psi.vercel.app",
    "https://127.0.0.1:5173",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)
