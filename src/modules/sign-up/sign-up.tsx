import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
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
          wins: userData.winBattle,
          favoritesSport: userData.favourite,
          rank: userData.ranking,
          winRate: userData.winRate,
          totalBattles: userData.totalBattle,
          streak: userData.winBattle,
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
              wins: userData.winBattle,
              favoritesSport: userData.favourite,
              rank: userData.ranking,
              winRate: userData.winRate,
              totalBattles: userData.totalBattle,
              streak: userData.winBattle,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative overflow-hidden">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-orange-200">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            <span className="text-sm">Back</span>
          </button>
        </div>
      </header>

      <main className="flex py-12 px-4 justify-center items-center">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Benefits */}
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  Start Your Sports
                  <br />
                  <span className="text-orange-600">Battle Journey</span>
                </h1>
                <p className="hidden lg:block text-xl text-gray-600 leading-relaxed">
                  Join over 500,000 sports fans competing in real-time trivia
                  battles. Test your knowledge and climb the leaderboards!
                </p>
              </div>
            </div>

            {/* Right Side - Sign Up Form */}
            <div>
              <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Create Your Account
                  </CardTitle>
                  <p className="text-gray-600">
                    Join the ultimate sports trivia community
                  </p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Social Sign Up */}
                  <div className="space-y-3">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap
                      theme="filled_blue"
                      shape="rectangular"
                      text="continue_with"
                      width="100%"
                    />
                    
                    {/* Error Display */}
                    {validationErrors.submit && (
                      <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-md p-3">
                        {validationErrors.submit}
                      </div>
                    )}
                    
                    {/* Loading State */}
                    {isLoading && (
                      <div className="flex items-center justify-center text-sm text-blue-600 text-center bg-blue-50 border border-blue-200 rounded-md p-3 gap-2">
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Creating your account. Please wait a moment.
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">
                        Or sign up with email
                      </span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <Link to="/signup-email">
                      <Button 
                        className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        <Mail className="w-5 h-5 mr-2" />
                        {isLoading ? 'Creating Account...' : 'Create with Email'}
                      </Button>
                    </Link>
                  </div>

                  {/* Sign In Link */}
                  <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-gray-600">
                      Already have an account?{" "}
                      <Link
                        to="/sign-in"
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        sign in
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
