import { Button } from "../../shared/ui/button";
import { Card, CardContent } from "../../shared/ui/card";
import { Badge } from "../../shared/ui/badge";
import { Zap, Users, Crown, Play } from "lucide-react";
import FAQ from "./faq";
import { useNavigate } from "react-router-dom";
      
export default function Component() {
  const navigate = useNavigate();
  return (
    <main className="flex-1 ">
      {/* Hero Section with Background Image - Full Viewport Height */}
      <section
        id="hero"
        className="relative w-full h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: "url('/landing.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
          {/* Your hero content here */}
          <h1 className="text-3xl sm:text-4xl md:text-4xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-orange-400   leading-tight">
            Welcome to h2h
          </h1>
          <p className="text-sm sm:text-xs md:text-lg w-2/3 lg:text-xl xl:text-2xl text-orange-100/90 max-w-xl leading-relaxed mt-6">
            Join a global community of sports enthusiasts and test your knowledge in real-time trivia battles.
          </p>
          <Button 
            className="mt-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300" 
            onClick={() => navigate('/sign-up')}
          >
            <Play className="w-5 h-5 mr-2" />
            Start Playing
          </Button>
        </div>

        {/* Stats moved to bottom of viewport */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl px-4">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">1M+</div>
              <div className="text-orange-100/80 text-sm">Battles</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">24/7</div>
              <div className="text-orange-100/80 text-sm">Live</div>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-400">10+</div>
              <div className="text-orange-100/80 text-sm">Sports</div>
            </div>
          </div>
        </div>
      </section>

      {/* Battle Modes Section with Diagonal Design */}
      <section
        id="battles"
        className="w-full py-8 relative scroll-mt-16 overflow-hidden"
      >
        {/* Background with diagonal elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-orange-50 -z-10"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-200 rounded-full opacity-20 -z-10"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-red-200 rounded-full opacity-20 -z-10"></div>

        {/* Diagonal divider */}
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-br from-orange-900/80 to-red-900/70 -z-10"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 0)" }}
        ></div>

        <div className="container px-4 md:px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Features and Services
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Different ways to test your sports knowledge
            </p>
          </div>

          <div className="flex flex-col gap-8 max-h-8xl max-w-6xl mx-auto">
            {[
              {
                name: "Quick Battles",
                icon: <Zap className="w-16 h-16 text-white" />,
                desc: "30-second lightning rounds perfect for quick matches between classes or during breaks",
                color: "red",
                video: "/placeholder-quick-battle.mp4",
              },
              {
                name: "Team Battles",
                icon: <Users className="w-16 h-16 text-white" />,
                desc: "Team up with friends and compete against other squads in group battles",
                color: "orange",
                video: "/placeholder-team-battle.mp4",
              },
              {
                name: "Leaderboard",
                icon: <Crown className="w-16 h-16 text-white" />,
                desc: "Compete with other players for the top spot on the leaderboard",
                color: "yellow",
                video: "/placeholder-tournament.mp4",
              },
              {
                name: "Rating and Titles",
                icon: <Crown className="w-16 h-16 text-white" />,
                desc: "Earn ratings and titles based on your performance",
                color: "yellow",
                video: "/placeholder-tournament.mp4",
              },
              {
                name: "Training",
                icon: <Crown className="w-16 h-16 text-white" />,
                desc: "Train your skills with our training mode",
                color: "yellow",
                video: "/placeholder-tournament.mp4",
              },
              {
                name: "Daily selections",
                icon: <Crown className="w-16 h-16 text-white" />,
                desc: "Daily selections of questions between goats from your favorite sports",
                color: "yellow",
                video: "/placeholder-tournament.mp4",
              },
            ].map((mode, idx) => (
              <Card
                key={mode.name}
                className={`flex flex-col ${
                  idx % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                } bg-white border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 rounded-xl overflow-hidden h-full`}
              >
                <div className="w-full md:w-1/2 h-8xl md:h-5xl flex-shrink-0 flex items-center justify-center p-4">
                  <video
                    src={mode.video}
                    className="rounded-lg shadow-lg object-cover w-full h-full"
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/placeholder.svg?height=200&width=320"
                  />
                </div>
                <CardContent
                  className={`pt-4 w-full md:w-1/2 flex flex-col ${
                    idx % 2 === 1
                      ? "items-end text-right"
                      : "items-start text-left"
                  }`}
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {mode.name}
                  </h3>
                  <p className="text-gray-600 mb-4 w-full md:w-2/3">
                    {mode.desc}
                  </p>
                  <Button 
                    className="w-full md:w-1/2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300"
                    onClick={() => navigate('/sign-up')}
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Playing
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Categories with Background Image */}
      <section
        id="sports"
        className="w-full py-12 md:py-24 scroll-mt-16 relative"
        style={{
          backgroundImage: "url('/placeholder.svg?height=1080&width=1920')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/90 to-red-900/80"></div>

        <div className="container px-4 md:px-6 relative z-10">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              All Your Favorite Sports
            </h2>
            <p className="text-base md:text-lg text-orange-100/80 max-w-2xl mx-auto">
              Test your knowledge across every major sport
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-5xl mx-auto">
            {[
              { name: "Football", icon: "🏈", battles: "50K+", popular: true },
              { name: "Basketball", icon: "🏀", battles: "45K+", popular: true },
              { name: "Soccer", icon: "⚽", battles: "60K+", popular: true },
              { name: "Baseball", icon: "⚾", battles: "35K+", popular: false },
              { name: "Hockey", icon: "🏒", battles: "25K+", popular: false },
              { name: "Tennis", icon: "🎾", battles: "20K+", popular: false },
              { name: "UFC/MMA", icon: "🥊", battles: "30K+", popular: true },
              { name: "Esports", icon: "🎮", battles: "40K+", popular: true },
            ].map((sport) => (
              <Card
                key={sport.name}
                className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer relative hover:scale-105 group transform-gpu"
              >
                <CardContent className="p-4 md:p-6 text-center">
                  {sport.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-orange-500/80 text-white border-orange-400/30 text-xs">
                      Popular
                    </Badge>
                  )}
                  <div className="text-3xl md:text-4xl mb-2 md:mb-3 group-hover:scale-110 transition-transform duration-300 transform-gpu">
                    {sport.icon}
                  </div>
                  <h3 className="font-semibold text-white text-sm md:text-base mb-1">
                    {sport.name}
                  </h3>
                  <p className="text-xs md:text-sm text-orange-100/70">
                    {sport.battles} battles
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <FAQ />
    </main>
  );
}
