import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { API_BASE_URL } from '../interface/gloabL_var';
import AvatarStorage from '../utils/avatar-storage';

interface UserAvatarProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  variant?: 'default' | 'faceit' | 'gaming' | 'competitive';
  status?: 'online' | 'offline' | 'away' | 'busy';
  showBorder?: boolean;
  showGlow?: boolean;
  className?: string;
  showFallback?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
  sm: 'h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8',
  md: 'h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10',
  lg: 'h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-12 lg:w-12',
  xl: 'h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-16 lg:w-16',
  '2xl': 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-20 lg:w-20',
  '3xl': 'h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 lg:h-24 lg:w-24',
  '4xl': 'h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 lg:h-32 lg:w-32'
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
  onClick
}) => {
  const avatarUrl = AvatarStorage.resolveAvatarUrl(user);
  const hasValidAvatar = avatarUrl && user.avatar && user.avatar.trim() !== '';

  // Enhanced click handling with hover effects
  const handleClick = onClick ? () => {
    onClick();
  } : undefined;

  const wrapperClasses = `
    ${sizeClasses[size]} 
    ${onClick ? 'cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95' : ''} 
    ${variant === 'faceit' ? 'hover:shadow-lg' : ''}
    rounded-full overflow-hidden aspect-square
    ${className}
  `.trim();

  return (
    <div 
      className={wrapperClasses} 
      onClick={handleClick}
      style={{ clipPath: 'circle(50%)' }}
    >
      <Avatar 
        className="w-full h-full"
        variant={variant}
        status={status}
        showBorder={showBorder}
        showGlow={showGlow}
      >
        {hasValidAvatar ? (
          <AvatarImage
            src={avatarUrl}
            alt={user.username}
            username={user.username}
          />
        ) : null}
        {showFallback && (
          <AvatarFallback username={user.username} variant={variant}>
            {user.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
          </AvatarFallback>
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