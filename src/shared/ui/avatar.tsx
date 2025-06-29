"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { API_BASE_URL } from "../interface/gloabL_var"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> & {
    username?: string
    avatarUrl?: string
  }
>(({ className, username, avatarUrl, ...props }, ref) => {
  // Determine the correct avatar URL
  const getAvatarUrl = () => {
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
      className={`aspect-square h-full w-full ${className}`}
      src={finalAvatarUrl || undefined}
      {...props}
    />
  )
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    username?: string
  }
>(({ className, username, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={`flex h-full w-full items-center justify-center rounded-full bg-orange-500 text-white font-semibold ${className}`}
    {...props}
  >
    {username ? username.slice(0, 2).toUpperCase() : "U"}
  </AvatarPrimitive.Fallback>
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
