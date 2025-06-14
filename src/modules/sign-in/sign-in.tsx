import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { GoogleLogin } from '@react-oauth/google'
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import type { User } from "../../shared/interface/user"

export default function SignInPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const {user, setUser} = useGlobalStore()

  useEffect(() => {
    document.title = "Sign In";
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    if (name === 'email') {
      if (value && !validateEmail(value)) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'Please enter a valid email address'
        }))
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.email
          return newErrors
        })
      }
    }
  }
  const canSubmit = () => {
    const hasValidEmail = validateEmail(formData.email);
    const hasAllFields = formData.email && formData.password;
    return hasValidEmail && hasAllFields;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) {
      return
    }

    const tempResponse = await axios.get("http://127.0.0.1:8000/user/signin", {
      params: {
        email: formData.email,
        password: formData.password,
        winRate: 0,
        totalBattle: 0,
        winBattle: 0,
        ranking: 1,
        favourite: "Football",
        streak: 0,
        username: "",
      },
      headers: {
        'accept': 'application/json'
      }
    });

    if (tempResponse.data) {
      user.email = tempResponse.data.email
      user.username = tempResponse.data.username
      user.avatar = ""
      user.wins = tempResponse.data.winBattle
      user.favoritesSport = tempResponse.data.favourite
      user.rank = tempResponse.data.ranking
      user.winRate = tempResponse.data.winRate
      user.totalBattles = tempResponse.data.totalBattle
      user.streak = tempResponse.data.winBattle
      setUser(user)
      localStorage.setItem("user", JSON.stringify(formData.email))
      navigate("/dashboard");
     }
    else{
      setValidationErrors({
        submit: 'Invalid email or password'
      })
    }
  }


  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      return;
    }

    try {
      const decodedToken = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      
      axios.post("http://127.0.0.1:8000/user/signup", {
        email: decodedToken.email,
        password: credentialResponse.credential,
        winRate: 0,
        totalBattle: 0,
        winBattle: 0,
        ranking: 1,
        favourite: "Football",
        streak: 0,
        username: decodedToken.given_name,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json'
        }
      })
      .then(async (response) => {
       if(response.data){
        user.email = decodedToken.email
        user.username = decodedToken.given_name
        user.avatar = ""
        user.wins = 0
        user.favoritesSport = "Football"
        user.rank = 1
        user.winRate = 0
        user.totalBattles = 0
        user.streak = 0
        setUser(user)
        localStorage.setItem("user", JSON.stringify(decodedToken.email))
        navigate("/dashboard");
       }
       else{
        const tempResponse = await axios.get("http://127.0.0.1:8000/user/signin", {
          params: {
            email: decodedToken.email,
            password: credentialResponse.credential,
            winRate: 0,
            totalBattle: 0,
            winBattle: 0,
            ranking: 1,
            favourite: "Football",
            streak: 0,
            username: decodedToken.given_name,
          },
          headers: {
            'accept': 'application/json'
          }
        });
  
        if (tempResponse.data) {
          user.email = decodedToken.email
          user.username = decodedToken.given_name
          user.avatar = ""
          user.wins = 0
          user.favoritesSport = "Football"
          user.rank = 1
          user.winRate = 0
          user.totalBattles = 0
          user.streak = 0
          setUser(user)
          localStorage.setItem("user", JSON.stringify(decodedToken.email))
          navigate("/dashboard");
        }
      }
      })
    } catch (error) {

    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 relative overflow-hidden">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white/80 backdrop-blur-sm border-b border-orange-200">
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
        <div className="container mx-auto max-w-3xl">
          <div className="relative">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Social Sign In */}
                <div className="space-y-3">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      console.log('Login Failed');
                      setValidationErrors({
                        submit: 'Google sign-in failed. Please try again.'
                      });
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
                    <span className="px-2 bg-white text-gray-500">Or sign in with email</span>
                  </div>
                </div>

                {/* Email Sign In Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.email}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="pl-10 pr-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  {validationErrors.submit && (
                    <div className="text-sm text-red-500 text-center">
                      {validationErrors.submit}
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={!canSubmit()}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
