import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useGlobalStore } from "../../shared/interface/gloabL_var";
import axios from "axios";
import type { User } from "../../shared/interface/user";

interface ApiUserData {
  email: string;
  username: string;
  totalBattle: number;
  winRate: number;
  ranking: number;
  winBattle: number;
  favourite: string;
  streak: number;
  password: string;
}

export default function EntryPage() {
  const navigate = useNavigate();
  const {user, setUser} = useGlobalStore()

  useEffect(() => {
    const userEmail = localStorage.getItem("user")?.replace(/"/g, ''); // Remove any quotation marks
    if(userEmail){
      axios.get<ApiUserData>(`http://127.0.0.1:8000/db/get-user`, {
        params: { email: userEmail },
        headers: {
          'accept': 'application/json'
        },
        responseType: 'json'
      })
      .then((res) => {
        if (res.data) {
          // Transform API data to match User interface
          const userData: User = {
            email: res.data.email,
            username: res.data.username,
            avatar: '', // Default avatar
            wins: res.data.winBattle,
            favoritesSport: res.data.favourite,
            rank: res.data.ranking,
            winRate: res.data.winRate,
            totalBattles: res.data.totalBattle,
            streak: res.data.streak,
            password: res.data.password
          };
          setUser(userData);
          navigate("/dashboard");
        }
      })
      .catch((error) => {
      });
    }
  }, [navigate, setUser]);

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
