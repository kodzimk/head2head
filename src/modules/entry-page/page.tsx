  import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"
import { useEffect } from "react";

export default function EntryPage() {
  useEffect(() => {
    document.title = "head2head";
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
