import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import BattlePage from './modules/battle/battle'
import WaitingRoom from './modules/battle/waiting-room'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/waiting/:username" element={<WaitingRoom />} />
      </Routes>
    </Router>
  )
}

export default App 