import { Link } from 'react-router-dom'
import { Trophy, Zap, Target, Play, ArrowRight, Award } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'

const stats = [
  { label: 'Battles Played', value: '1.5k+', icon: Zap, trend: '+%' },
  { label: 'Sports Categories', value: '8+', icon: Trophy, trend: '+3' }
];

const sports = [
  { name: 'Football', icon: '⚽', matches: '1.2k+', difficulty: 'All Levels' },
  { name: 'Basketball', icon: '🏀', matches: '800+', difficulty: 'Pro Ready' },
  { name: 'Tennis', icon: '🎾', matches: '640+', difficulty: 'Competitive' },
  { name: 'Baseball', icon: '⚾', matches: '420+', difficulty: 'Expert' },
  { name: 'Hockey', icon: '🏒', matches: '380+', difficulty: 'Elite' },
  { name: 'Golf', icon: '⛳', matches: '290+', difficulty: 'Masters' },
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
  return (
    <div className="relative min-h-screen bg-gaming-pattern overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-card"></div>
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-floating"></div>
      <div className="absolute bottom-20 left-20 w-64 h-64 bg-neon-blue/5 rounded-full blur-3xl animate-floating" style={{ animationDelay: '-1s' }}></div>
      
      <div className="relative z-10">
        {/* Main Hero Section */}
        <section className="section-padding-sm mt-16">
          <div className="container-gaming">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <div className="space-y-4 text-center lg:text-left">

                  <h1 className="text-display text-foreground leading-gaming">
                    Dominate the
                    <span className="text-neon text-primary block">
                      SPORTS ARENA
                    </span>
                  </h1>
                  
                  <p className="text-body-large text-muted-foreground max-w-xl mx-auto lg:mx-0">
                    Challenge players worldwide in real-time sports trivia battles. 
                    Climb the rankings, master multiple sports, and become the ultimate champion.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto">
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
                      className="stat-card bg-card/30 border-primary/20 hover:border-primary/40 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className="w-5 h-5 text-primary" />
                  
                      </div>
                      <div className="stat-value text-xl">{stat.value}</div>
                      <div className="stat-label">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Content - Sports Grid */}
              <div className="space-y-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-heading-2 text-foreground mb-2 font-rajdhani">
                    Choose Your Sport
                  </h3>
                  <p className="text-muted-foreground">
                    Master trivia across multiple sports categories
          </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {sports.map((sport, index) => (
                    <div 
                      key={sport.name}
                      className="match-card group cursor-pointer animate-scale-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-3xl">{sport.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-rajdhani font-semibold text-foreground group-hover:text-primary transition-colors">
                            {sport.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {sport.matches} played
                          </p>
                        </div>
        </div>

                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className="text-xs border-primary/30 text-primary bg-primary/5"
                        >
                          {sport.difficulty}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
            </div>
            </div>
          </div>
        </div>
      </section>

        {/* Features Section */}
        <section className="section-padding-sm bg-card/20">
          <div className="container-gaming">
            <div className="text-center mb-12">
              <h2 className="text-heading-1 text-foreground mb-4 font-rajdhani">
                Why Choose Head2Head?
            </h2>
              <p className="text-body-large text-muted-foreground max-w-2xl mx-auto">
                Experience the most competitive sports trivia platform with cutting-edge features
            </p>
          </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div 
                  key={feature.title}
                  className="card-neon p-6 group hover:scale-102 transition-all duration-300 animate-slide-in-left"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="neon-glow-orange p-2 rounded-lg bg-primary/10">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs">
                      {feature.highlight}
                    </Badge>
                  </div>
                  
                  <h3 className="text-heading-3 text-foreground mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  
                  <p className="text-body-small text-muted-foreground">
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
            <div className="card-neon p-8 lg:p-12 text-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  
                  <h2 className="text-heading-1 text-foreground font-rajdhani">
                    Join the Elite Sport Community
                  </h2>
                  
                  <p className="text-body-large text-muted-foreground max-w-2xl mx-auto">
                    Start your journey to becoming a sports trivia champion. Battle the best, 
                    climb the rankings, and prove your expertise.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto">
                      <Trophy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  
                  <Link to="/leaderboard">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/30 hover:border-primary/60 hover:bg-primary/5">
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
