import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import '../shared/i18n/i18n'

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
        <App />
    </GoogleOAuthProvider>
    </BrowserRouter>
)
