import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Checkbox } from "../../shared/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, AlertCircle, Info, X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import { initializeWebSocketForNewUser } from "../../app/App"
import { API_BASE_URL } from "../../shared/interface/gloabL_var"

interface ValidationErrors {
  email?: string;
  password?: string;
  submit?: string;
}

export default function EmailSignUpPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordInfo, setShowPasswordInfo] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState({
    username:"",
    email: "",
    password: "",
    agreeToTerms: false,
  })

  const { setUser} = useGlobalStore()

  useEffect(() => {
    document.title = "Sign Up with Email";
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 8;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Validate on change
    if (name === 'email') {
      const isValid = validateEmail(value);
      if (!isValid && value) {  // Only show error if there's a value
        setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      } else {
        setValidationErrors(prev => ({ ...prev, email: undefined }));
      }
    }

    if (name === 'password') {
      const isValid = validatePassword(value);
      if (!isValid && value) {  // Only show error if there's a value
        setValidationErrors(prev => ({ 
          ...prev, 
          password: 'Password must be at least 8 characters long' 
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, password: undefined }));
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) {
      return
    }

    // Send the data to the server using POST method with JSON body
    axios.post(`${API_BASE_URL}/auth/signup`, {
      email: formData.email,
      password: formData.password,
      username: formData.username,
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
    })
      .then(response => {
        if (response.data) {
          const userData = response.data.user;
          const updatedUser = {
            email: userData.email,
            username: userData.username,
            wins: userData.winBattle,
            favoritesSport: userData.favourite,
            rank: userData.ranking,
            winRate: userData.winRate,
            totalBattles: userData.totalBattle,
            streak: userData.streak,
            password: userData.password,
            friends: userData.friends || [],
            friendRequests: userData.friendRequests || [],
            battles: userData.battles || [],
            invitations: userData.invitations || [],
            avatar: userData.avatar,
            nickname: userData.username
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
          navigate(`/${userData.username}`)
        } else {
          setValidationErrors({
            submit: 'Signup failed. Account already exists.'
          })
        }
      })
      .catch(error => {
        if (error.response) {
          // Handle 422 validation errors
          if (error.response.status === 422) {
            const errorData = error.response.data;
            // Update validation errors with server response
            setValidationErrors(prev => ({
              ...prev,
              email: errorData.detail?.email || errorData.detail,
              password: errorData.detail?.password,
              submit: 'Please fix the errors above'
            }));
          }
          else if (error.response.status === 401) {
            setValidationErrors({
              submit: error.response.data.message || 'Signup failed. Username already exists.'
            })
          }
          else {
            setValidationErrors({
              submit: error.response.data.message || 'Signup failed. Please try again.'
            })
          }
        } else if (error.request) {
          setValidationErrors({
            submit: 'No response from server. Please try again.'
          })
        } else {
          setValidationErrors({
            submit: 'An error occurred. Please try again.'
          })
        }
      })
  }

  const canSubmit = () => {
    const hasValidEmail = validateEmail(formData.email);
    const hasValidPassword = validatePassword(formData.password);
    const hasAllFields = formData.username && formData.email && formData.password;
    const hasAgreedToTerms = formData.agreeToTerms;

    const isValid = hasValidEmail && hasValidPassword && hasAllFields && hasAgreedToTerms;
    return isValid;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-1/30 via-background to-primary/5 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gaming-pattern opacity-5"></div>
      
      {/* Header */}
      <header className="relative z-10 px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center backdrop-blur-md border-b border-border/50"
              style={{ backgroundColor: 'hsl(220 13% 12% / 0.95)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate("/sign-up")}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors p-1 sm:p-2 rounded-lg hover:bg-card/20"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
            <span className="text-xs sm:text-sm font-medium">Back</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 flex py-4 sm:py-8 lg:py-12 px-3 sm:px-4 justify-center items-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto max-w-sm sm:max-w-md lg:max-w-2xl">
          {/* Main Form Card */}
          <Card 
            className="card-surface backdrop-blur-sm border-border/50 shadow-xl sm:shadow-2xl relative"
          >
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Sign Up with Email</CardTitle>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">Fill in your details to get started</p>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Username */}
                <div>
                  <Label htmlFor="username" className="text-sm sm:text-base font-medium text-foreground">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Choose a unique username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full pl-10 sm:pl-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm sm:text-base font-medium text-foreground">Email Address</Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your-email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`w-full pl-10 sm:pl-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background ${
                          validationErrors.email ? 'border-destructive focus:border-destructive' : ''
                        }`}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <div className="flex items-center text-destructive text-xs sm:text-sm min-h-[20px]">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                        <span>{validationErrors.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm sm:text-base font-medium text-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInfo(!showPasswordInfo)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                      <Info className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  {showPasswordInfo && (
                    <div className="bg-card border border-border rounded-lg p-3 mb-2 relative">
                      <button
                        type="button"
                        onClick={() => setShowPasswordInfo(false)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-sm font-medium text-foreground mb-2">Password Requirements:</p>
                      <ul className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                        <li className="flex items-start">
                          <span className="text-primary mr-1.5">•</span>
                          At least 8 characters long
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-1.5">•</span>
                          Include uppercase and lowercase letters
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-1.5">•</span>
                          Include at least one number
                        </li>
                        <li className="flex items-start">
                          <span className="text-primary mr-1.5">•</span>
                          Include at least one special character (!@#$%^&*)
                        </li>
                      </ul>
                    </div>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background ${
                        validationErrors.password ? 'border-destructive focus:border-destructive' : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <div className="flex items-center text-destructive text-xs sm:text-sm min-h-[20px]">
                      <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 flex-shrink-0" />
                      <span>{validationErrors.password}</span>
                    </div>
                  )}
                </div>

                {/* Terms Agreement */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreeToTerms"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
                      }
                      required
                      className="mt-1 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <Label htmlFor="agreeToTerms" className="text-xs sm:text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:text-primary/80 underline font-medium transition-colors">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-primary hover:text-primary/80 underline font-medium transition-colors">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                {validationErrors.submit && (
                  <div className="text-xs sm:text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span>{validationErrors.submit}</span>
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 lg:h-16 btn-neon text-sm sm:text-base lg:text-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
                  disabled={!canSubmit()}
                >
                  Create Account
                </Button>
              </form>
              
              {/* Sign In Link */}
              <div className="text-center pt-4 border-t border-border/50">
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
      </main>
    </div>
  )
}
