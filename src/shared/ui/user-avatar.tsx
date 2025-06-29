import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { API_BASE_URL } from '../interface/gloabL_var';

interface UserAvatarProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-32 w-32',
  '3xl': 'h-40 w-40'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showFallback = true
}) => {
  const getAvatarUrl = (avatar: string | null | undefined): string | null => {
    if (!avatar) return null;
    
    // If it's already a full URL, use it
    if (avatar.startsWith('http')) {
      return avatar;
    }
    
    // If it's a relative path, prepend API base URL
    if (avatar.startsWith('/')) {
      return `${API_BASE_URL}${avatar}`;
    }
    
    // If it's just a filename, construct the full path
    return `${API_BASE_URL}/avatars/${avatar}`;
  };

  const avatarUrl = getAvatarUrl(user.avatar);
  const hasValidAvatar = avatarUrl && user.avatar && user.avatar.trim() !== '';

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {hasValidAvatar ? (
        <AvatarImage
          src={avatarUrl}
          alt={user.username}
          username={user.username}
        />
      ) : null}
      {showFallback && (
        <AvatarFallback username={user.username}>
          {user.username ? user.username.slice(0, 2).toUpperCase() : 'U'}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default UserAvatar; 