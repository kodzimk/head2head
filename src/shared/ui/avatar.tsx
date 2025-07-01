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
  const [localAvatarUrl, setLocalAvatarUrl] = React.useState<string | null>(null);
  const [, setIsLoading] = React.useState(false);

  // Load local avatar asynchronously
  React.useEffect(() => {
    const loadLocalAvatar = async () => {
      if (username) {
        setIsLoading(true);
        try {
          const localAvatar = await AvatarStorage.getAvatar(username);
          setLocalAvatarUrl(localAvatar);
        } catch (error) {
          console.error('[AvatarImage] Failed to load local avatar:', error);
          setLocalAvatarUrl(null);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadLocalAvatar();
  }, [username]);

  // Determine the correct avatar URL with localStorage priority
  const getAvatarUrl = () => {
    // If we have a local avatar from IndexedDB, use it first
    if (localAvatarUrl) {
      return localAvatarUrl;
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

// Enhanced avatar generation utility functions
const generateColorFromUsername = (username: string) => {
  // Create a simple hash from the username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Define attractive color schemes
  const colorSchemes = [
    // Orange theme (primary)
    { from: '#f97316', to: '#ea580c', text: '#ffffff' },
    // Blue theme
    { from: '#3b82f6', to: '#1d4ed8', text: '#ffffff' },
    // Purple theme
    { from: '#8b5cf6', to: '#7c3aed', text: '#ffffff' },
    // Green theme
    { from: '#10b981', to: '#059669', text: '#ffffff' },
    // Pink theme
    { from: '#ec4899', to: '#db2777', text: '#ffffff' },
    // Teal theme
    { from: '#06b6d4', to: '#0891b2', text: '#ffffff' },
    // Indigo theme
    { from: '#6366f1', to: '#4f46e5', text: '#ffffff' },
    // Red theme
    { from: '#ef4444', to: '#dc2626', text: '#ffffff' },
    // Emerald theme
    { from: '#34d399', to: '#10b981', text: '#ffffff' },
    // Yellow theme
    { from: '#fbbf24', to: '#f59e0b', text: '#000000' },
  ];
  
  const colorIndex = Math.abs(hash) % colorSchemes.length;
  return colorSchemes[colorIndex];
};

const generatePatternFromUsername = (username: string) => {
  // Create pattern based on username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const patterns = [
    'bg-gradient-to-br',
    'bg-gradient-to-bl',
    'bg-gradient-to-tr',
    'bg-gradient-to-tl',
    'bg-gradient-to-r',
    'bg-gradient-to-l',
  ];
  
  const patternIndex = Math.abs(hash) % patterns.length;
  return patterns[patternIndex];
};

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    username?: string
    variant?: "default" | "faceit" | "gaming" | "competitive"
  }
>(({ className, username, variant = "default", ...props }, ref) => {
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.slice(0, 2).toUpperCase();
  };

  const getEnhancedVariantClasses = () => {
    if (!username) {
      // Default fallback without username
      return "flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-400 to-gray-600 text-white font-semibold rounded-full";
    }

    const pattern = generatePatternFromUsername(username);
    
    const baseClasses = "flex h-full w-full items-center justify-center rounded-full font-bold text-lg tracking-wide";
    
    switch (variant) {
      case "faceit":
        return `${baseClasses} ${pattern} shadow-lg border-2 border-white/20 backdrop-blur-sm`;
      case "gaming":
        return `${baseClasses} ${pattern} shadow-xl border-2 border-white/30 animate-pulse`;
      case "competitive":
        return `${baseClasses} ${pattern} shadow-2xl border-3 border-white/40 font-extrabold text-xl tracking-wider`;
      default:
        return `${baseClasses} ${pattern}`;
    }
  };

  const getInlineStyles = () => {
    if (!username) {
      return {};
    }
    
    const colors = generateColorFromUsername(username);
    return {
      background: `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
      color: colors.text,
    };
  };

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={`aspect-square ${getEnhancedVariantClasses()} ${className}`}
      style={{ 
        clipPath: 'circle(50%)',
        ...getInlineStyles()
      }}
      {...props}
    >
      <span className="relative z-10 drop-shadow-sm">
        {getInitials(username)}
      </span>
      {/* Optional decorative pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          clipPath: 'circle(50%)',
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 2px, transparent 2px),
                       radial-gradient(circle at 70% 70%, rgba(255,255,255,0.2) 1px, transparent 1px)`,
          backgroundSize: '20px 20px, 30px 30px'
        }}
      />
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
