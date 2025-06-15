from auth.router import auth_router
from db.router import db_router
from fastapi.middleware.cors import CORSMiddleware
from init import app

app.include_router(auth_router,prefix='/auth')
app.include_router(db_router,prefix='/db')

origins = [
    "http://127.0.0.1:5173",
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
