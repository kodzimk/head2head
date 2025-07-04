<div align="center">
<pre>
Head2Head
---------------------------------------------------
Online platform where people can battle about sport knowledge<br>
</pre>
</div>

# About

Kaddera is ai powered marketing promoter,assistant focused on promoting and enhancing users chance to get attention and consumers and custumers.<br>

# Head2Head - Real-Time Battle Platform

A real-time sports quiz battle platform where users can create and join battles with instant updates.

## Real-Time Features

### WebSocket-Based Real-Time Updates

The application uses WebSocket connections to provide real-time updates for battle creation and management:

#### Battle Creation Events
- **Real-time battle creation**: When a user creates a new battle, all connected users automatically receive the update
- **Battle removal**: When a battle is cancelled or joined, it's immediately removed from all users' waiting lists
- **Battle joining**: When someone joins a battle, all users see the battle removed from the waiting list

#### Event Types
- `battle_created`: New battle appears in waiting list
- `battle_removed`: Battle removed from waiting list (cancelled or joined)
- `battle_joined`: Battle removed from waiting list (someone joined)

#### Technical Implementation
- **Backend**: FastAPI WebSocket endpoint with broadcast messaging
- **Frontend**: React with WebSocket connection management
- **Isolation**: Battle events are isolated from chat and game sockets
- **Logging**: Comprehensive logging on both server and client sides

#### Debug Features (Development)
- WebSocket connection status indicator
- Test connection functionality
- Real-time event logging
- Battle list debugging tools

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker and Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd head2head
   ```

2. **Start the backend services**
   ```bash
   cd backend
   docker-compose up -d
   ```

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the backend directory:
```env
REDIS_URL=redis://redis:6379/0
DATABASE_URL=postgresql+asyncpg://postgres:Kais123@db:5432/user_db
```

## Usage

1. **Sign up/Sign in** to create an account
2. **Navigate to Battles** to see the battle creation interface
3. **Create a battle** by selecting sport and difficulty level
4. **Real-time updates** will show the battle to all connected users
5. **Join battles** created by other users
6. **Watch real-time updates** as battles are created, joined, or cancelled

## Development

### Testing Real-Time Features

1. Open the application in multiple browser tabs/windows
2. Create a battle in one tab
3. Watch the battle appear instantly in other tabs
4. Join the battle from another tab
5. Watch the battle disappear from all waiting lists

### Debug Panel

In development mode, a debug panel is available on the battles page with:
- WebSocket connection status
- Test connection button
- Refresh battles button
- Battle list logging

## Architecture

### Backend (FastAPI + WebSocket)
- WebSocket connection management
- Real-time event broadcasting
- Battle state management
- Manual quiz generation

### Frontend (React + TypeScript)
- WebSocket client management
- Real-time state updates
- Battle list rendering
- User interface components

### Real-Time Flow
1. User creates battle via REST API
2. Backend broadcasts `battle_created` event
3. All connected clients receive the event
4. Frontend updates battle list in real-time
5. Users can immediately see and join the new battle

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test real-time functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
