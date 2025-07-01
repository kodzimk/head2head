import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Zap, Target, Play, ArrowRight, Award } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'

const stats = [
  { label: 'Battles Played', value: '1.5k+', icon: Zap, trend: '+%' },
  { label: 'Sports Categories', value: '8+', icon: Trophy, trend: '+3' }
];

const sports = [
  { 
    name: 'Football', 
    icon: '⚽', 
    matches: '1.2k+', 
    difficulty: 'All Levels',
    gradient: 'from-green-500 to-emerald-600'
  },
  { 
    name: 'Basketball', 
    icon: '🏀', 
    matches: '800+', 
    difficulty: 'Pro Ready',
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    name: 'Tennis', 
    icon: '🎾', 
    matches: '640+', 
    difficulty: 'Competitive',
    gradient: 'from-yellow-500 to-green-600'
  },
  { 
    name: 'Baseball', 
    icon: '⚾', 
    matches: '420+', 
    difficulty: 'Expert',
    gradient: 'from-blue-500 to-indigo-600'
  },
  { 
    name: 'Hockey', 
    icon: '🏒', 
    matches: '380+', 
    difficulty: 'Elite',
    gradient: 'from-cyan-500 to-blue-600'
  },
  { 
    name: 'Golf', 
    icon: '⛳', 
    matches: '290+', 
    difficulty: 'Masters',
    gradient: 'from-teal-500 to-green-600'
  },
];

const features = [
  {
    icon: Trophy,
    title: 'Competitive Ranking',
    description: 'Climb the global leaderboards and prove your sports knowledge',
    highlight: 'Global Rankings'
  },
  {
    icon: Zap,
    title: 'Real-time Battles',
    description: 'Challenge players worldwide in live trivia showdowns',
    highlight: 'Live Matches'
  },
  {
    icon: Target,
    title: 'Skill-based Matching',
    description: 'Face opponents of similar skill levels for fair competition',
    highlight: 'Fair Play'
  },
  {
    icon: Award,
    title: 'Achievement System',
    description: 'Unlock exclusive badges and climb division tiers',
    highlight: 'Unlock Rewards'
  },
];

export default function Hero() {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Sports Background Image with Effects */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/landing.jpg)',
          filter: 'grayscale(100%) brightness(0.3) blur(2px)',
        }}
      ></div>
      
      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/60"></div>
      
      {/* Gaming Pattern Overlay */}
      <div className="absolute inset-0 bg-gaming-pattern"></div>
      
      {/* Gradient Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-card/80"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-floating"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl animate-floating" style={{ animationDelay: '-1s' }}></div>
      
      {/* Floating Sport Elements */}
      <div className="absolute top-32 left-1/4 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-xl animate-floating opacity-30" style={{ animationDelay: '-2s' }}></div>
      <div className="absolute bottom-32 right-1/4 w-24 h-24 bg-gradient-to-br from-neon-blue/20 to-transparent rounded-full blur-xl animate-floating opacity-30" style={{ animationDelay: '-3s' }}></div>
      
      <div className="relative z-10">
        {/* Main Hero Section */}
        <section className="section-padding-sm mt-16">
          <div className="container-gaming">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <div className="space-y-4 text-center lg:text-left">

                  <h1 className="text-display text-white leading-gaming drop-shadow-2xl">
                    Dominate the
                    <span className="text-neon text-primary block drop-shadow-2xl">
                      SPORTS BATTLES
                    </span>
                  </h1>
                  
                  <p className="text-body-large text-gray-200 max-w-xl mx-auto lg:mx-0 drop-shadow-lg">
                    Challenge players worldwide in real-time sports trivia battles. 
                    Climb the rankings, master multiple sports, and become the ultimate champion.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto shadow-2xl">
                      <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Start Competing
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                </div>

                {/* Quick Stats */}
                <div className="flex gap-4 pt-8 justify-center lg:justify-start mx-auto lg:mx-0 max-w-fit lg:max-w-none">
                  {stats.map((stat, index) => (
                    <div 
                      key={stat.label} 
                      className="stat-card bg-black/40 backdrop-blur-sm border-primary/30 hover:border-primary/60 animate-fade-in shadow-2xl"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className="w-5 h-5 text-primary" />
                  
                      </div>
                      <div className="stat-value text-xl text-white">{stat.value}</div>
                      <div className="stat-label text-gray-300">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Content - Enhanced Sports Grid */}
              <div className="space-y-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-heading-2 text-white mb-2 font-rajdhani drop-shadow-lg">
                    Choose Your Sport
                  </h3>
                  <p className="text-gray-200 drop-shadow-sm">
                    Master trivia across multiple sports categories
          </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {sports.map((sport, index) => (
                    <div 
                      key={sport.name}
                      className="group cursor-pointer animate-scale-in bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:border-primary/50 hover:bg-black/50 transition-all duration-300 shadow-xl"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => navigate(`/sign-up`)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`text-3xl p-2 rounded-lg bg-gradient-to-br ${sport.gradient} bg-opacity-20 backdrop-blur-sm border border-white/10`}>
                          {sport.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-rajdhani font-semibold text-white group-hover:text-primary transition-colors drop-shadow-sm">
                            {sport.name}
                          </h4>
                          <p className="text-sm text-gray-300">
                            {sport.matches} played
                          </p>
                        </div>
        </div>

                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs border-primary/30 text-primary bg-primary/10 backdrop-blur-sm"
                        >
                          {sport.difficulty}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
            </div>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section className="section-padding-sm bg-black/20 backdrop-blur-sm">
          <div className="container-gaming">
            <div className="text-center mb-8 mt-8">
              <h2 className="text-heading-1 text-white mb-4 font-rajdhani drop-shadow-lg">
                Why Choose Head2Head?
            </h2>
              <p className="text-body-large text-gray-200 max-w-2xl mx-auto drop-shadow-sm">
                Experience the most competitive sports trivia platform with cutting-edge features
            </p>
          </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="p-6 group hover:scale-102 transition-all duration-300 animate-slide-in-left   rounded-xl"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="neon-glow-orange p-2 rounded-lg">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-xs">
                      {feature.highlight}
                    </Badge>
                  </div>
                  
                  <h3 className="text-heading-3 text-white mb-2 group-hover:text-primary transition-colors drop-shadow-sm">
                    {feature.title}
                  </h3>
                  
                  <p className="text-body-small text-gray-300">
                    {feature.description}
                  </p>
                </div>
            ))}
          </div>
        </div>
      </section>

        {/* Final CTA Section */}
        <section className="section-padding-sm">
          <div className="container-gaming">
            <div className="p-8 lg:p-12 text-center  rounded-xl   ">
              <div className="space-y-6">
                <div className="space-y-4">
                  
                  <h2 className="text-heading-1 text-white font-rajdhani ">
                    Join the Elite Sport Community
                  </h2>
                  
                  <p className="text-body-large text-gray-200 max-w-2xl mx-auto drop-shadow-sm">
                    Start your journey to becoming a sports trivia champion. Battle the best, 
                    climb the rankings, and prove your expertise.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto shadow-2xl">
                      <Trophy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  
                  <Link to="/leaderboard">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/30 hover:border-primary/60 hover:bg-primary/10 backdrop-blur-sm text-white shadow-xl">
                      View Leaderboard
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
