import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Checkbox } from "../../shared/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, AlertCircle } from "lucide-react"
import {  useNavigate } from "react-router-dom"
import axios from "axios"
import { useGlobalStore } from "../../shared/interface/gloabL_var"
import { initializeWebSocketForNewUser } from "../../app/App"
import { API_BASE_URL } from "../../shared/interface/gloabL_var"
import { isValidUsername } from "../../shared/utils/username-normalization"
import { useTranslation } from "react-i18next"

interface ValidationErrors {
  email?: string;
  password?: string;
  username?: string;
  submit?: string;
}

export default function EmailSignUpPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [formData, setFormData] = useState({
    username:"",
    email: "",
    password: "",
    agreeToTerms: false,
  })

  const { setUser } = useGlobalStore()

  useEffect(() => {
    document.title = t('signUp.pageTitle');
  }, [t]);

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

    if (name === 'email') {
      const isValid = validateEmail(value);
      if (!isValid && value) {
        setValidationErrors(prev => ({ ...prev, email: t('signUp.validation.invalidEmail') }));
      } else {
        setValidationErrors(prev => ({ ...prev, email: undefined }));
      }
    }

    if (name === 'password') {
      const isValid = validatePassword(value);
      if (!isValid && value) {
        setValidationErrors(prev => ({ 
          ...prev, 
          password: t('signUp.validation.passwordLength')
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, password: undefined }));
      }
    }

    if (name === 'username') {
      const validation = isValidUsername(value);
      if (!validation.valid && value) {
        setValidationErrors(prev => ({ 
          ...prev, 
          username: t(`signUp.validation.username.${validation.reason}`)
        }));
      } else {
        setValidationErrors(prev => ({ ...prev, username: undefined }));
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit()) {
      return
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/signup`,
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      );

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
        
        // Set isNewUser flag for onboarding
        localStorage.setItem('isNewUser', 'true');
        
        localStorage.removeItem('head2head-battle-onboarding');
        localStorage.removeItem('head2head-training-onboarding');
        localStorage.removeItem('head2head-dashboard-onboarding');
        
        initializeWebSocketForNewUser(userData.username);
        navigate(`/${userData.username}`)
      } else {
        setValidationErrors({
          submit: t('signUp.errors.accountExists')
        })
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 422) {
          const errorData = error.response.data;
          setValidationErrors(prev => ({
            ...prev,
            email: errorData.detail?.email && t('signUp.validation.invalidEmail'),
            password: errorData.detail?.password && t('signUp.validation.passwordLength'),
            username: errorData.detail?.username && t('signUp.validation.usernameExists'),
            submit: t('signUp.errors.fixErrors')
          }));
        }
        else if (error.response.status === 401) {
          setValidationErrors({
            submit: t('signUp.errors.usernameExists')
          })
        }
        else {
          setValidationErrors({
            submit: t('signUp.errors.generic')
          })
        }
      } else if (error.request) {
        setValidationErrors({
          submit: t('signUp.errors.noResponse')
        })
      } else {
        setValidationErrors({
          submit: t('signUp.errors.unknown')
        })
      }
    }
  }

  const canSubmit = () => {
    const hasValidEmail = validateEmail(formData.email);
    const hasValidPassword = validatePassword(formData.password);
    const hasValidUsername = isValidUsername(formData.username).valid;
    const hasAllFields = formData.username && formData.email && formData.password;
    const hasAgreedToTerms = formData.agreeToTerms;

    return hasValidEmail && hasValidPassword && hasValidUsername && hasAllFields && hasAgreedToTerms;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <button
            onClick={() => navigate("/sign-up")}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {t('auth.signUpWithEmail')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('auth.fillDetails')}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('auth.email')}
                </Label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground/70" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('auth.emailAddress')}
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`pl-10 h-11 bg-background transition-colors border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary w-full ${
                      validationErrors.email ? 'border-destructive focus:border-destructive' : ''
                    }`}
                  />
                  {validationErrors.email && (
                    <div className="absolute right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  {t('auth.username')}
                </Label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground/70" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder={t('auth.chooseUsername')}
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`pl-10 h-11 bg-background transition-colors border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary w-full ${
                      validationErrors.username ? 'border-destructive focus:border-destructive' : ''
                    }`}
                  />
                  {validationErrors.username && (
                    <div className="absolute right-0 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                </div>
                {validationErrors.username && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  {t('auth.password')}
                </Label>
                <div className="relative flex items-center">
                  <div className="absolute left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground/70" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.createStrongPassword')}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`pl-10 pr-10 h-11 bg-background transition-colors border-muted-foreground/20 hover:border-muted-foreground/40 focus:border-primary w-full ${
                      validationErrors.password ? 'border-destructive focus:border-destructive' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground/70 hover:text-muted-foreground transition-colors" />
                    )}
                  </button>
                  {validationErrors.password && (
                    <div className="absolute right-10 pr-3 flex items-center pointer-events-none">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, agreeToTerms: checked as boolean }))
                  }
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none text-muted-foreground hover:text-foreground cursor-pointer select-none"
                >
                  {t('auth.agreeToTerms')}
                </label>
              </div>

              {validationErrors.submit && (
                <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg flex items-center gap-2 border border-destructive/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>{validationErrors.submit}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={!canSubmit()}
              >
                {t('auth.createAccount')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
