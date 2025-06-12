import './globals.css'
import {Routes, Route} from 'react-router-dom'
import EntryPage from '../modules/entry-page/page'
import SignUpPage from '../modules/sign-up/sign-up'
import EmailSignUpPage from '../modules/sign-up/signup-email'
import SignInPage from '../modules/sign-in/sign-in'

export default function App() {
  return (
    <Routes>
      <Route path = '/' element = {<EntryPage />} />
      <Route path = '/sign-up' element = {<SignUpPage />} />
      <Route path = '/signup-email' element = {<EmailSignUpPage />} />
      <Route path = '/sign-in' element = {<SignInPage />} />
    </Routes>
  )
}
