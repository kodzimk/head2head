import Header from "./header"
import Hero from "./hero"
import Footer from "./footer"

export default function EntryPage() {
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
