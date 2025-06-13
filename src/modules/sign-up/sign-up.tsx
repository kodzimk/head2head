import { useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Mail, ArrowLeft } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { GoogleLogin } from '@react-oauth/google'
import axios from "axios"

export default function SignUpPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Sign Up";
  }, []);


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

      <main className="flex-1 py-12 px-4">  
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
                  Join over 500,000 sports fans competing in real-time trivia battles. Test your knowledge and climb the
                  leaderboards!
                </p>
              </div>
            </div>

            {/* Right Side - Sign Up Form */}
            <div className="relative">
              <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Create Your Account</CardTitle>
                  <p className="text-gray-600">Join the ultimate sports trivia community</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Social Sign Up */}
                  <div className="space-y-3">
                    <GoogleLogin
                      onSuccess={(credentialResponse) => {                    
                        if (!credentialResponse.credential) {
                          return;
                        }

                        const decodedToken = JSON.parse(atob(credentialResponse.credential.split('.')[1]));                
                        // Try to sign up first
                        axios.post("http://127.0.0.1:8000/user/signup", {
                          email: decodedToken.email,
                          username: decodedToken.email,
                          password: credentialResponse.credential,
                        }, {
                          headers: {
                            'Content-Type': 'application/json',
                            'accept': 'application/json'
                          }
                        })
                        .then(response => {
                          console.log('Signup successful:', response.data);
                          navigate("/dashboard");
                        })
                        .catch(error => {
                          axios.post("http://127.0.0.1:8000/user/signin", {
                            email: decodedToken.email,
                            password: credentialResponse.credential,
                          }, {
                            headers: {
                              'Content-Type': 'application/json',
                              'accept': 'application/json'
                            }
                          })
                          .then(response => {
                            navigate("/dashboard");
                          })
                          .catch(signinError => {
             
                          });
                        });
                      }}
                      onError={() => {
                        
                      }}
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
                      <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <Link to ="/signup-email">
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
                      <Link to="/sign-in" className="text-orange-600 hover:text-orange-700 font-medium">
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
  )
}
