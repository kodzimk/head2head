import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, ''); // Remove any quotation marks
    if(userEmail){
      navigate("/dashboard");
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
