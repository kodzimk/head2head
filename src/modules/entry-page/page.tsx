import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const username = localStorage.getItem("username");
    if(username && localStorage.getItem("access_token")){
        navigate(`/${username}`);
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
