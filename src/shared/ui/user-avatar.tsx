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

  // Load avatar asynchronously with proper priority
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.username) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const resolvedUrl = await AvatarStorage.resolveAvatarUrlAsync(user);
        setAvatarUrl(resolvedUrl);
      } catch (error) {
        console.error('[UserAvatar] Failed to load avatar:', error);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, [user?.username, user?.avatar]);

  const hasValidAvatar = avatarUrl && avatarUrl.trim() !== '';

  // Enhanced click handling with hover effects
  const handleClick = onClick ? () => {
    onClick();
  } : undefined;

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
      onClick={handleClick}
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
        {hasValidAvatar && !isLoading ? (
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
        ) : null}
        {showFallback && (
          <AvatarFallback username={user.username} variant={variant} className="w-full h-full flex items-center justify-center" />
        )}
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