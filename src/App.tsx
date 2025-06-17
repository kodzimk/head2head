import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import BattlePage from './modules/battle/battle'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/battle" element={<BattlePage />} />
      </Routes>
    </Router>
  )
}

export default App 