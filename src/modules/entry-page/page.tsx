import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"

export default function EntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, '');
    axios.get(`http://localhost:8000/db/get-user?email=${userEmail}`).then(
      (response) => {
        const userUsername = response.data.username;
        if(userUsername){
          navigate(`/${userUsername}`);
        }
      }
    )
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
