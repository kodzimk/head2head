import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { useAvatarManager } from '../hooks/use-avatar-manager';

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
  const { avatarUrl, isLoading } = useAvatarManager(user);

  const hasValidAvatar = avatarUrl && avatarUrl.trim() !== '';
  
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
    <Avatar 
      className={wrapperClasses}
      onClick={handleClick}
      variant={variant}
      status={status}
      showBorder={showBorder}
      showGlow={showGlow}
    >
      {isLoading ? (
        <div className="animate-pulse bg-muted rounded-full w-full h-full" />
      ) : (
        <>
          <AvatarImage
            src={avatarUrl || undefined}
            alt={user.username}
            className="object-cover"
          />
          {showFallback && !hasValidAvatar && (
            <AvatarFallback>
              {user.username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </>
      )}
    </Avatar>
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