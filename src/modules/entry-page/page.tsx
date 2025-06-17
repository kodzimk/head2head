import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { User } from "../../shared/interface/user"

export default function EntryPage({user}: {user: User}) {
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem("user")?.replace(/"/g, '');
    if(email){
      setTimeout(() => {
        navigate(`/${user.username}`);
      }, 100)
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
     <Header />
     <Hero />
     
      {/* Footer */}
     <Footer />
    </div>
  )
}
