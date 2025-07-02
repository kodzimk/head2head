import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import { GoogleLogin } from '@react-oauth/google'
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import { initializeWebSocketForNewUser } from "../../app/App"
import { API_BASE_URL } from "../../shared/interface/gloabL_var"
import { generateUsername, generateProperName } from "../../shared/utils/username-normalization"
import { useTranslation } from 'react-i18next'

export default function SignInPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const {user, setUser} = useGlobalStore()

  useEffect(() => {
    document.title = t('signIn.pageTitle');
  }, [t]);

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
          email: t('signIn.validation.invalidEmail')
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

    setValidationErrors({});
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/signin`,
        {
          username: formData.email,
          password: formData.password,
          email: formData.email,
        },
        {
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
          },
        }
      );

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
        navigate(`/${userData.username}`);
        initializeWebSocketForNewUser(userData.username);
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      if (error.response) {
        const status = error.response.status;
        
        switch (status) {
          case 401:
            setValidationErrors({
              submit: t('signIn.errors.invalidCredentials')
            });
            break;
          case 404:
            setValidationErrors({
              submit: t('signIn.errors.userNotFound')
            });
            break;
          case 422:
            setValidationErrors({
              submit: t('signIn.errors.invalidInput')
            });
            break;
          case 500:
            setValidationErrors({
              submit: t('signIn.errors.serverError')
            });
            break;
          default:
            setValidationErrors({
              submit: t('signIn.errors.unexpectedError')
            });
        }
      } else if (error.request) {
        setValidationErrors({
          submit: t('signIn.errors.networkError')
        });
      } else {
        setValidationErrors({
          submit: t('signIn.errors.genericError')
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

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
    
    // Try sign-in, if fails, try sign-up
    try {
      const response = await axios.post(
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
        navigate(`/${userData.username}`);
        initializeWebSocketForNewUser(userData.username);
      }
    } catch (error: any) {
      // If sign-in fails due to account not existing, try sign-up
      if (error.response?.status === 404) {
        try {
          // Generate a clean username from the Google display name
          let normalizedUsername = generateUsername(decodedToken.name || decodedToken.email);
          
          // If the username looks like an email or is too weird, generate a proper name
          if (normalizedUsername.includes('@') || normalizedUsername.length < 4 || /^\d/.test(normalizedUsername)) {
            normalizedUsername = generateProperName();
          }

          const signUpResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: decodedToken.email,
            password: credentialResponse.credential,
            username: normalizedUsername,
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

          if (signUpResponse.data) {
            const userData = signUpResponse.data.user;
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
            localStorage.setItem('access_token', signUpResponse.data.access_token);
            localStorage.setItem("username", userData.username);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            // Set isNewUser flag for onboarding since this is a new signup through Google
            localStorage.setItem('isNewUser', 'true');
            
            navigate(`/${userData.username}`);
            initializeWebSocketForNewUser(userData.username);
          }
        } catch (signUpError: any) {
          setValidationErrors({
            submit: t('signIn.errors.googleSignUpError')
          });
        }
      } else {
        setValidationErrors({
          submit: t('signIn.errors.googleSignInError')
        });
      }
    } finally {
      setIsLoading(false);
    }
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
            onClick={() => navigate('/sign-up')}
            className="flex items-center text-muted-foreground hover:text-primary transition-colors p-1 sm:p-2 rounded-lg hover:bg-card/20"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
            <span className="text-xs sm:text-sm font-medium">{t('signIn.back')}</span>
          </button>
        </div>  
      </header>

      <main className="relative z-10 flex py-4 sm:py-8 lg:py-12 px-3 sm:px-4 justify-center items-center min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto max-w-sm sm:max-w-md lg:max-w-2xl xl:max-w-3xl">
          <div className="relative">
            <Card className="card-surface backdrop-blur-sm border-border/50 shadow-xl sm:shadow-2xl">
              <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{t('signIn.title')}</CardTitle>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">{t('signIn.subtitle')}</p>
              </CardHeader>

              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
                {/* Social Sign In */}
                <div className="space-y-3">
                  <div className="w-full">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        console.log('Login Failed');
                        setValidationErrors({
                          submit: t('signIn.errors.googleSignInError')
                        });
                      }}
                      useOneTap
                      theme="filled_blue"
                      shape="rectangular"
                      text="continue_with"
                      width="100%"
                    />
                  </div>
                </div>

                <div className="relative my-4 sm:my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-xs sm:text-sm">
                    <span className="px-3 sm:px-4 bg-card text-muted-foreground font-medium">{t('signIn.or')}</span>
                  </div>
                </div>

                {/* Email Sign In Form */}
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm sm:text-base font-medium text-foreground">{t('signIn.form.emailLabel')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t('signIn.form.emailPlaceholder')}
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full pl-10 sm:pl-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background"
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-xs sm:text-sm text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        {validationErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm sm:text-base font-medium text-foreground">{t('signIn.form.passwordLabel')}</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs sm:text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        {t('signIn.form.forgotPassword')}
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('signIn.form.passwordPlaceholder')}
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 h-10 sm:h-12 lg:h-14 text-sm sm:text-base border-border focus:border-primary focus:ring-primary/20 bg-background"
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
                  </div>

                  {/* Submit Button */}
                  {validationErrors.submit && (
                    <div className="text-xs sm:text-sm text-destructive text-center bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                      <span>{validationErrors.submit}</span>
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={!canSubmit() || isLoading}
                    className="w-full h-10 sm:h-12 lg:h-14 btn-neon text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        {t('signIn.form.signingIn')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        {t('signIn.form.signIn')}
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    )}
                  </Button>
                </form>
                
                {/* Sign Up Link */}
                <div className="text-center pt-4 border-t border-border/50">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {t('signIn.noAccount')} {" "}
                    <Link
                      to="/sign-up"
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      {t('signIn.createAccount')}
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}