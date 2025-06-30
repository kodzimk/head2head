"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { API_BASE_URL } from "../interface/gloabL_var"
import AvatarStorage from "../utils/avatar-storage"

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  variant?: "default" | "faceit" | "gaming" | "competitive"
  status?: "online" | "offline" | "away" | "busy"
  showBorder?: boolean
  showGlow?: boolean
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, variant = "default", status, showBorder = false, showGlow = false, ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "faceit":
        return `relative flex shrink-0 overflow-hidden rounded-full border-2 border-primary/30 shadow-lg ${showGlow ? 'shadow-primary/25' : ''} transition-all duration-300 hover:border-primary/50 hover:scale-105`
      case "gaming":
        return `relative flex shrink-0 overflow-hidden rounded-full border-2 border-gradient-to-r from-primary to-primary-light shadow-xl ${showGlow ? 'shadow-primary/30' : ''} transition-all duration-300 hover:shadow-2xl`
      case "competitive":
        return `relative flex shrink-0 overflow-hidden rounded-full border-3 border-primary shadow-2xl ${showGlow ? 'shadow-primary/40 animate-pulse' : ''} transition-all duration-300 hover:border-primary-light`
      default:
        return `relative flex shrink-0 overflow-hidden rounded-full ${showBorder ? 'border-2 border-border' : ''} transition-all duration-300`
    }
  }

  const statusIndicatorClasses = status ? {
    online: "bg-success border-success",
    offline: "bg-muted border-muted",
    away: "bg-warning border-warning",
    busy: "bg-destructive border-destructive"
  }[status] : ""

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={`aspect-square rounded-full overflow-hidden ${getVariantClasses()} ${className}`}
        style={{ clipPath: 'circle(50%)' }}
        {...props}
      />
      {status && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${statusIndicatorClasses} z-10`} />
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    username?: string
    avatarUrl?: string
  }
>(({ className, username, avatarUrl, ...props }, ref) => {
  // Determine the correct avatar URL with localStorage priority
  const getAvatarUrl = () => {
    // If username is provided, try localStorage first
    if (username) {
      const localAvatar = AvatarStorage.getAvatar(username);
      if (localAvatar) {
        return localAvatar;
      }
    }
    
    if (avatarUrl) {
      // If it's already a full URL, use it
      if (avatarUrl.startsWith('http')) {
        return avatarUrl
      }
      // If it's a relative path, prepend API base URL
      if (avatarUrl.startsWith('/')) {
        return `${API_BASE_URL}${avatarUrl}`
      }
      // If it's just a filename, construct the full path
      return `${API_BASE_URL}/avatars/${avatarUrl}`
    }
    return null
  }

  const finalAvatarUrl = getAvatarUrl()

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={`aspect-square h-full w-full object-cover object-center rounded-full ${className}`}
      src={finalAvatarUrl || undefined}
      style={{ clipPath: 'circle(50%)' }}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    username?: string
    variant?: "default" | "faceit" | "gaming" | "competitive"
  }
>(({ className, username, variant = "default", ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "faceit":
        return "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-bold text-lg tracking-wide rounded-full"
      case "gaming":
        return "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/80 to-secondary text-primary-foreground font-bold text-xl rounded-full"
      case "competitive":
        return "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-primary-hover text-primary-foreground font-extrabold text-xl tracking-wider rounded-full"
      default:
        return "flex h-full w-full items-center justify-center bg-primary text-primary-foreground font-semibold rounded-full"
    }
  }

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={`aspect-square ${getVariantClasses()} ${className}`}
      style={{ clipPath: 'circle(50%)' }}
      {...props}
    >
      {username ? username.slice(0, 2).toUpperCase() : "U"}
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
