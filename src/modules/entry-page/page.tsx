import Header from "./header"
import Hero from "./hero"
import FAQ from "./faq"
import Footer from "./footer"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

export default function EntryPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();


  useEffect(() => {
    
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage && ['en', 'ru'].includes(savedLanguage)) {
      i18n.changeLanguage(savedLanguage);
    } else {
      // If no language is saved, save the current language
      localStorage.setItem("language", i18n.language);
    }

    // Check for authenticated user
    const username = localStorage.getItem("username");
    if(username){
      navigate(`/${username}`);
    }
  }, [i18n, navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
     <Header />
     <Hero />
     <FAQ />
     <Footer />
    </div>
  )
}
