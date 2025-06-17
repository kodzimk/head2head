import { Button } from "../../shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card";
import { Mail, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useGlobalStore } from "../../shared/interface/gloabL_var";

export default function SignUpPage() {
  const navigate = useNavigate();
  const { user, setUser } = useGlobalStore();

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
                      onSuccess={async (credentialResponse) => {
                        if (!credentialResponse.credential) {
                          return;
                        }

                        const decodedToken = JSON.parse(
                          atob(credentialResponse.credential.split(".")[1])
                        );
                        
                        try {
                          const response = await axios.post("http://127.0.0.1:8000/auth/signup", {
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
                          }, {
                            headers: {
                              'Content-Type': 'application/json',
                              'accept': 'application/json'
                            }
                          });

                          if (response.data) {
                            const updatedUser = {
                              ...user,
                              email: response.data.email,
                              username: response.data.username,
                              wins: response.data.winBattle,
                              favoritesSport: response.data.favourite,
                              rank: response.data.ranking,
                              winRate: response.data.winRate,
                              totalBattles: response.data.totalBattle,
                              streak: response.data.winBattle,
                              password: response.data.password,
                              avatar: response.data.avatar,
                              friends: response.data.friends,
                              friendRequests: response.data.friendRequests
                            };
                            setUser(updatedUser);
                            localStorage.setItem("user", JSON.stringify(response.data.email));
                            navigate(`/${response.data.username}`);
                          }
                        } catch (error: any) {
                          if (error.response?.status === 401) {
                            // User already exists, try to sign in
                            try {
                              const signInResponse = await axios.get(
                                "http://127.0.0.1:8000/auth/signin",
                                {
                                  params: {
                                    email: decodedToken.email,
                                    password: credentialResponse.credential,
                                  },
                                  headers: {
                                    "Content-Type": "application/json",
                                    accept: "application/json",
                                  },
                                }
                              );

                              if (signInResponse.data) {
                                const updatedUser = {
                                  ...user,
                                  email: signInResponse.data.email,
                                  username: signInResponse.data.username,
                                  wins: signInResponse.data.winBattle,
                                  favoritesSport: signInResponse.data.favourite,
                                  rank: signInResponse.data.ranking,
                                  winRate: signInResponse.data.winRate,
                                  totalBattles: signInResponse.data.totalBattle,
                                  streak: signInResponse.data.winBattle,
                                  password: signInResponse.data.password,
                                  avatar: signInResponse.data.avatar,
                                  friends: signInResponse.data.friends,
                                  friendRequests: signInResponse.data.friendRequests
                                };
                                setUser(updatedUser);
                                localStorage.setItem("user", JSON.stringify(signInResponse.data.email));
                                navigate(`/${signInResponse.data.username}`);
                              }
                            } catch (signInError: any) {
                            }
                          }
                        }
                      }}
                      onError={() => {}}
                      useOneTap
                      theme="filled_blue"
                      shape="rectangular"
                      text="continue_with"
                      width="100%"
                    />
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
                      <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold">
                        <Mail className="w-5 h-5 mr-2" />
                        Create with Email
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
