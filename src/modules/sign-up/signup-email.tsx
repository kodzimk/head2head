import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Checkbox } from "../../shared/ui/checkbox"
import { Eye, EyeOff, Mail, Lock, User,  ArrowLeft, AlertCircle, Info, X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"

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
      console.log("Form validation failed")
      return
    }

    // Send the data to the server using POST method with JSON body
    axios.post("http://127.0.0.1:8000/user/signup", {
      username: formData.username,
      email: formData.email,
      password: formData.password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
      }
    })
      .then(response => {
        if (response.data === true) {
          navigate("/dashboard")
        } else {
          setValidationErrors({
            submit: 'Signup failed. Account already exists.'
          })
        }
      })
      .catch(error => {
        console.error("Signup failed:", error)
        if (error.response) {
          // Handle 422 validation errors
          if (error.response.status === 422) {
            const errorData = error.response.data;
            // Update validation errors with server response
            setValidationErrors(prev => ({
              ...prev,
              email: errorData.detail?.email || errorData.detail,
              username: errorData.detail?.username,
              password: errorData.detail?.password,
              submit: 'Please fix the errors above'
            }));
          } else {
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

      <main className="flex-1 py-4 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Main Form Card */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-2xl relative">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold text-gray-900">Sign Up with Email</CardTitle>
              <p className="text-gray-600">Fill in your details to get started</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields */}
                <div className="">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="kodzimk"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>
               

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="space-y-1">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="kodzimk@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 ${
                          validationErrors.email ? 'border-red-500' : ''
                        }`}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <div className="flex items-center text-red-500 text-sm min-h-[20px]">
                        <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span>{validationErrors.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowPasswordInfo(!showPasswordInfo)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                  {showPasswordInfo && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2 relative">
                      <button
                        type="button"
                        onClick={() => setShowPasswordInfo(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <p className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</p>
                      <ul className="text-xs space-y-1.5 text-gray-600">
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-1.5">•</span>
                          At least 8 characters long
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-1.5">•</span>
                          Include uppercase and lowercase letters
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-1.5">•</span>
                          Include at least one number
                        </li>
                        <li className="flex items-start">
                          <span className="text-orange-500 mr-1.5">•</span>
                          Include at least one special character (!@#$%^&*)
                        </li>
                      </ul>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500 ${
                          validationErrors.password ? 'border-red-500' : ''
                        }`}
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
                    {validationErrors.password && (
                      <div className="flex items-center text-red-500 text-sm min-h-[20px]">
                        <AlertCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                        <span>{validationErrors.password}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agreeToTerms"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
                      }
                      required
                      className="mt-1"
                    />
                    <Label htmlFor="agreeToTerms" className="text-sm text-gray-600 leading-relaxed">
                      I agree to the{" "}
                      <Link to="/terms" className="text-orange-600 hover:text-orange-700 underline font-medium">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-orange-600 hover:text-orange-700 underline font-medium">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                </div>

                {/* Submit Button */}
                {validationErrors.submit && (
                  <div className="text-sm text-red-500 text-center mb-4">
                    {validationErrors.submit}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white font-semibold text-lg shadow-lg"
                  disabled={!canSubmit()}
                >
                  Create Account
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </main>

    </div>
  )
}
