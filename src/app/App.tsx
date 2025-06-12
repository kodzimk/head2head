import './globals.css'
import {Routes, Route} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'

export default function App() {
  return (
    <Routes>
      <Route path = '/' element = {<EntryPage />} />
      <Route path = '/sign-up' element = {null} />
    </Routes>
  )
}
