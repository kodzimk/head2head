import { useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Mail, ArrowLeft } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

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
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Start Your Sports
                  <br />
                  <span className="text-orange-600">Battle Journey</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
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
                    <Button variant="outline" className="w-full h-12 border-gray-300 hover:bg-gray-50" type="button">
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>

                    <Button variant="outline" className="w-full h-12 border-gray-300 hover:bg-gray-50" type="button">
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Continue with Facebook
                    </Button>
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
