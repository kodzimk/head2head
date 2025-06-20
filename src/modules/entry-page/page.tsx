import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const email = localStorage.getItem("user")?.replace(/"/g, '');
    const username = localStorage.getItem("username")?.replace(/"/g, '');
    
    if(email && username){
      setTimeout(() => {
        navigate(`/${username}`);
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
