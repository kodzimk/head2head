"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "../../shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../shared/ui/card"
import { Input } from "../../shared/ui/input"
import { Label } from "../../shared/ui/label"
import { Checkbox } from "../../shared/ui/checkbox"
import { Badge } from "../../shared/ui/badge"
import { Eye, EyeOff, Mail, Lock, User, Calendar, ArrowLeft, Trophy, Shield, Zap } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

export default function EmailSignUpPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    agreeToTerms: false,
    subscribeNewsletter: true,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log("Form submitted:", formData)
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
                    <Label htmlFor="firstName">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="kodzimk"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        required
                      />
                    </div>
                  </div>
               

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="kodzimk@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
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
                  <p className="text-xs text-gray-500">Must be at least 8 characters with numbers and letters</p>
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
                <Button
                  type="submit"
                  className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white font-semibold text-lg shadow-lg"
                  disabled={!formData.agreeToTerms}
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
