import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useGlobalStore } from "../../shared/interface/gloabL_var";
import { initializeWebSocketForNewUser } from "../../app/App";
import { useState } from "react";
import { API_BASE_URL } from "../../shared/interface/gloabL_var";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, setUser } = useGlobalStore();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      return;
    }

    setIsLoading(true);
    setValidationErrors({});

    let decodedToken;
    try {
      const tokenParts = credentialResponse.credential.split(".");
      if (tokenParts.length === 3) {
        const payload = tokenParts[1];    
        const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
        decodedToken = JSON.parse(atob(paddedPayload));
      } else {
        decodedToken = JSON.parse(credentialResponse.credential);
      }
    } catch (decodeError) {
      console.error('Error decoding token:', decodeError);
      decodedToken = {
        email: 'user@example.com',
        name: 'User'
      };
    }
    
    // Try sign-up, if fails, try sign-in
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
        email: decodedToken.email,
        password: credentialResponse.credential,
        username: decodedToken.name,
        winRate: 0,
        totalBattle: 0,
        winBattle: 0,
        ranking: 1,
        favourite: "Football",
        streak: 0,
        friends: [],
        friendRequests: [],
        avatar: '',
        battles: [],
        invitations: []
      }, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      });

      if (response.data) {
        const userData = response.data.user;
        const updatedUser = {
          ...user,
          email: userData.email,
          username: userData.username,
          nickname: userData.username,
          wins: userData.winBattle,
          favoritesSport: userData.favourite,
          rank: userData.ranking,
          winRate: userData.winRate,
          totalBattles: userData.totalBattle,
          streak: userData.streak,
          password: userData.password,
          avatar: userData.avatar,
          friends: userData.friends,
          friendRequests: userData.friendRequests,
          battles: userData.battles,
          invitations: userData.invitations
        };
        setUser(updatedUser);
        localStorage.setItem('access_token', response.data.access_token);  
        localStorage.setItem("username", userData.username);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Clear onboarding localStorage keys for new users to ensure they see onboarding
        localStorage.removeItem('head2head-battle-onboarding');
        localStorage.removeItem('head2head-training-onboarding');
        localStorage.removeItem('head2head-dashboard-onboarding');
        
        initializeWebSocketForNewUser(userData.username);
        navigate(`/${userData.username}`);
      }
    } catch (error: any) {
      // If sign-up fails due to account existing, try sign-in
      if (error.response?.status === 401 || error.response?.status === 404) {
        try {
          const signInResponse = await axios.post(
            `${API_BASE_URL}/auth/signin`,
            {
              username: decodedToken.email,
              password: credentialResponse.credential,
              email: decodedToken.email,
            },
            {
              headers: {
                "Content-Type": "application/json",
                accept: "application/json",
              },
            }
          );

          if (signInResponse.data) {
            const userData = signInResponse.data.user;
            const updatedUser = {
              ...user,
              email: userData.email,
              username: userData.username,
              nickname: userData.username,
              wins: userData.winBattle,
              favoritesSport: userData.favourite,
              rank: userData.ranking,
              winRate: userData.winRate,
              totalBattles: userData.totalBattle,
              streak: userData.streak,
              password: userData.password,
              avatar: userData.avatar,
              friends: userData.friends,
              friendRequests: userData.friendRequests,
              battles: userData.battles,
              invitations: userData.invitations
            };
            setUser(updatedUser);
            localStorage.setItem('access_token', signInResponse.data.access_token);
            localStorage.setItem("username", userData.username);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            initializeWebSocketForNewUser(userData.username);
            navigate(`/${userData.username}`);
          }
        } catch (signInError: any) {
          setValidationErrors({
            submit: 'Google sign-in failed. Please try again or use email sign-up.'
          });
        }
      } else {
        setValidationErrors({
          submit: 'Google sign-up failed. Please try again or use email sign-up.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.log('Google sign-up failed');
    setValidationErrors({
      submit: 'Google sign-up failed. Please try again or use email sign-up.'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-1/30 via-background to-primary/5 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gaming-pattern opacity-5"></div>
      
      {/* Header */}
      <header className="relative z-10 px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center backdrop-blur-md border-b border-border/50"
              style={{ backgroundColor: 'hsl(220 13% 12% / 0.95)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors p-1 sm:p-2 rounded-lg hover:bg-card/20"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
            <span className="text-xs sm:text-sm font-medium">Back</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex py-4 sm:py-8 lg:py-12 px-3 sm:px-4 justify-center items-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Left Side - Benefits */}
            <div 
              className="hidden lg:block space-y-6"
            >
              <div className="space-y-4">
                <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground leading-tight">
                  Start Your Sports
                  <br />
                  <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Battle Journey
                  </span>
                </h1>
                <p className="text-lg xl:text-xl text-muted-foreground leading-relaxed">
                  Join over 500,000 sports fans competing in real-time trivia
                  battles. Test your knowledge and climb the leaderboards!
                </p>
              </div>
  
            </div>

            {/* Right Side - Sign Up Form */}
            <div className="w-full">
              <div className="lg:hidden mb-6 text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Start Your Sports{" "}
                  <span className="text-primary">Battle Journey</span>
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Join the ultimate sports trivia community
                </p>
              </div>
              
              <Card 
                className="card-surface backdrop-blur-sm border-border/50 shadow-xl lg:shadow-2xl"
              >
                <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                    Create Your Account
                  </CardTitle>
                  <p className="text-sm sm:text-base text-muted-foreground mt-2">
                    Join thousands of sports trivia fans
                  </p>
                </CardHeader>

                <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                  {/* Social Sign Up */}
                  <div className="space-y-3">
                    <div 
                      className="w-full"
                    >
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap
                        theme="filled_blue"
                        shape="rectangular"
                        text="continue_with"
                        width="100%"
                      />
                    </div>
                    
                    {/* Error Display */}
                    {validationErrors.submit && (
                      <div className="text-xs sm:text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        <span>{validationErrors.submit}</span>
                      </div>
                    )}
                    
                    {/* Loading State */}
                    {isLoading && (
                      <div className="flex items-center justify-center text-xs sm:text-sm text-primary text-center bg-primary/10 border border-primary/20 rounded-lg p-3 gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        Creating your account. Please wait a moment.
                      </div>
                    )}
                  </div>

                  <div className="relative my-4 sm:my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs sm:text-sm">
                      <span className="px-3 sm:px-4 bg-card text-muted-foreground font-medium">
                        Or sign up with email
                      </span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <Link to="/signup-email">
                      <Button 
                        className="w-full h-10 sm:h-12 lg:h-14 btn-neon text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
                        disabled={isLoading}
                      >
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {isLoading ? 'Creating Account...' : 'Create with Email'}
                      </Button>
                    </Link>
                  </div>

                  {/* Sign In Link */}
                  <div 
                    className="text-center pt-4 border-t border-border/50"
                  >
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link
                        to="/sign-in"
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
