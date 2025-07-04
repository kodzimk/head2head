import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Zap, Target, Play, ArrowRight, Award, TextSelect } from 'lucide-react'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { useTranslation } from 'react-i18next'

const getSports = (t: any) => [
  { 
    name: t('sports.football'), 
    icon: '⚽', 
    matches: '1.2k+', 
    difficulty: t('hero.allLevels'),
    gradient: 'from-green-500 to-emerald-600'
  },
  { 
    name: t('sports.basketball'), 
    icon: '🏀', 
    matches: '800+', 
    difficulty: t('hero.proReady'),
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    name: t('sports.tennis'), 
    icon: '🎾', 
    matches: '640+', 
    difficulty: t('hero.competitive'),
    gradient: 'from-yellow-500 to-green-600'
  },
  { 
    name: t('sports.baseball'), 
    icon: '⚾', 
    matches: '420+', 
    difficulty: t('hero.expert'),
    gradient: 'from-blue-500 to-indigo-600'
  },
  { 
    name: t('sports.hockey'), 
    icon: '🏒', 
    matches: '380+', 
    difficulty: t('hero.elite'),
    gradient: 'from-cyan-500 to-blue-600'
  },
  { 
    name: t('sports.golf'), 
    icon: '⛳', 
    matches: '290+', 
    difficulty: t('hero.masters'),
    gradient: 'from-teal-500 to-green-600'
  },
];

const getFeatures = (t: any) => [
  {
    icon: TextSelect,
    title: t('hero.selectionMode'),
    description: t('hero.selectionModeDesc'),
    highlight: t('hero.selectionMode')
  },
  {
    icon: Zap,
    title: t('hero.realTimeBattles'),
    description: t('hero.realTimeBattlesDesc'),
    highlight: t('hero.liveMatches')
  },
  {
    icon: Award,
    title: t('hero.teamBattles'),
    description: t('hero.teamBattlesDesc'),
    highlight: t('hero.teamBattles')
  },
  {
    icon: Target,
    title: t('hero.trainingMode'),
    description: t('hero.trainingModeDesc'),
    highlight: t('hero.trainingMode')
  }
];

export default function Hero() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const sports = getSports(t);
  const features = getFeatures(t);
  
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
                    {t('hero.dominateTitle')}
                    <span className="text-neon text-primary block drop-shadow-2xl">
                      {t('hero.sportsBattles')}
                    </span>
                  </h1>
                  
                  <p className="text-body-large text-gray-200 max-w-xl mx-auto lg:mx-0 drop-shadow-lg">
                    {t('hero.challengePlayersWorldwide')}
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto shadow-2xl">
                      <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      {t('hero.startCompeting')}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>

                </div>

              </div>

              {/* Right Content - Enhanced Sports Grid */}
              <div className="space-y-6">
                <div className="text-center lg:text-left">
                  <h3 className="text-heading-2 text-white mb-2 font-rajdhani drop-shadow-lg">
                    {t('hero.chooseSport')}
                  </h3>
                  <p className="text-gray-200 drop-shadow-sm">
                    {t('hero.masterTrivia')}
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
                            {sport.matches} {t('hero.played')}
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
                {t('hero.whyChoose')}
              </h2>
              <p className="text-body-large text-gray-200 max-w-2xl mx-auto drop-shadow-sm">
                {t('hero.experience')}
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
                    {t('hero.joinCommunity')}
                  </h2>
                  
                  <p className="text-body-large text-gray-200 max-w-2xl mx-auto drop-shadow-sm">
                    {t('hero.startJourney')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/sign-up">
                    <Button size="lg" className="btn-neon group w-full sm:w-auto shadow-2xl">
                      <Trophy className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      {t('hero.createAccount')}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  
                  <Link to="/leaderboard">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/30 hover:border-primary/60 hover:bg-primary/10 backdrop-blur-sm text-white shadow-xl">
                      {t('hero.viewLeaderboard')}
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
