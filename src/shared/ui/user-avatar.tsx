import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import AvatarStorage from '../utils/avatar-storage';
interface UserAvatarProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  variant?: 'default' | 'faceit' | 'gaming' | 'competitive';
  status?: 'online' | 'offline' | 'away' | 'busy';
  showBorder?: boolean;
  showGlow?: boolean;
  className?: string;
  showFallback?: boolean;
  onClick?: () => void;
  isUploadAvatar?: boolean;
}

const sizeClasses = {
  xs: 'h-4 w-4',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
  '2xl': 'h-16 w-16',
  '3xl': 'h-20 w-20',
  '4xl': 'h-32 w-32',
  '5xl': 'h-40 w-40',
  '6xl': 'h-48 w-48'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  variant = 'default',
  status,
  showBorder = false,
  showGlow = false,
  className = '',
  showFallback = true,
  onClick,
  isUploadAvatar = false
}) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setError] = useState<Error | null>(null);

  // Load avatar asynchronously with proper priority and caching
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.username) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First try to get from local storage
        const localAvatar = await AvatarStorage.getAvatar(user.username);
        if (localAvatar) {
          setAvatarUrl(localAvatar);
          setIsLoading(false);
          return;
        }

        // If no local avatar but we have a server avatar, try to cache it
        if (user.avatar) {
          const serverUrl = AvatarStorage.resolveAvatarUrl(user);
          if (serverUrl) {
            try {
              // Try to cache the server avatar
              await AvatarStorage.cacheServerAvatar(user.username, serverUrl);
              const cachedAvatar = await AvatarStorage.getAvatar(user.username);
              if (cachedAvatar) {
                setAvatarUrl(cachedAvatar);
              } else {
                // If caching fails, use server URL directly
                setAvatarUrl(serverUrl);
              }
            } catch (cacheError) {
              console.warn('[UserAvatar] Failed to cache avatar:', cacheError);
              // If caching fails, use server URL directly
              setAvatarUrl(serverUrl);
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('[UserAvatar] Failed to load avatar:', error);
        setError(error instanceof Error ? error : new Error('Failed to load avatar'));
        setAvatarUrl(null);
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, [user?.username, user?.avatar]);

  const wrapperClasses = `
    ${isUploadAvatar ? 'w-full h-full' : sizeClasses[size]} 
    ${onClick ? 'cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95' : ''} 
    ${variant === 'faceit' ? 'hover:shadow-lg' : ''}
    rounded-full overflow-hidden aspect-square flex items-center justify-center
    ${className}
  `.trim();

  return (
    <div 
      className={wrapperClasses} 
      onClick={onClick}
      style={{ 
        clipPath: 'circle(50%)',
        overflow: 'hidden',
        ...(isUploadAvatar ? { width: '100%', height: '100%' } : {})
      }}
    >
      <Avatar 
        className="w-full h-full flex items-center justify-center overflow-hidden"
        variant={variant}
        status={status}
        showBorder={showBorder}
        showGlow={showGlow}
      >
        {isLoading ? (
          <div className="w-full h-full bg-muted animate-pulse" />
        ) : avatarUrl ? (
          <AvatarImage
            src={avatarUrl}
            alt={user.username}
            username={user.username}
            className="w-full h-full object-cover"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              width: '100%',
              height: '100%',
              ...(isUploadAvatar ? { minWidth: '100%', minHeight: '100%' } : {})
            }}
          />
        ) : showFallback ? (
          <AvatarFallback 
            username={user.username} 
            variant={variant} 
            className="w-full h-full flex items-center justify-center"
          >
            {user.username?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        ) : null}
      </Avatar>
    </div>
  );
};

// Specialized Faceit Avatar component
export const FaceitAvatar: React.FC<Omit<UserAvatarProps, 'variant'>> = (props) => (
  <UserAvatar {...props} variant="faceit" showBorder={true} showGlow={true} />
);

// Gaming Avatar component
export const GamingAvatar: React.FC<Omit<UserAvatarProps, 'variant'>> = (props) => (
  <UserAvatar {...props} variant="gaming" showBorder={true} showGlow={true} />
);

// Competitive Avatar component
export const CompetitiveAvatar: React.FC<Omit<UserAvatarProps, 'variant'>> = (props) => (
  <UserAvatar {...props} variant="competitive" showBorder={true} showGlow={true} />
);

export default UserAvatar; 