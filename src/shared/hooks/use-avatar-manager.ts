import { useState, useEffect } from 'react';
import AvatarStorage from '../utils/avatar-storage';
import { API_BASE_URL } from '../interface/gloabL_var';

interface User {
  username: string;
  avatar?: string | null;
}

interface AvatarManagerResult {
  avatarUrl: string | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export const useAvatarManager = (user: User): AvatarManagerResult => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAvatar = async () => {
    if (!user?.username) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get local avatar first
      const localAvatar = await AvatarStorage.getAvatar(user.username);
      if (localAvatar) {
        setAvatarUrl(localAvatar);
        setIsLoading(false);
        return;
      }

      // If no local avatar but server avatar exists, cache it
      if (user.avatar) {
        const fullAvatarUrl = user.avatar.startsWith('http') 
          ? user.avatar 
          : `${API_BASE_URL}${user.avatar}`;

        const response = await fetch(fullAvatarUrl);
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'avatar.jpg', { type: blob.type });
          await AvatarStorage.saveAvatar(user.username, file);
          const cachedAvatar = await AvatarStorage.getAvatar(user.username);
          setAvatarUrl(cachedAvatar);
        } else {
          throw new Error('Failed to fetch avatar');
        }
      }
    } catch (err) {
      console.error('[useAvatarManager] Failed to load avatar:', err);
      setError(err instanceof Error ? err : new Error('Failed to load avatar'));
      // Fallback to server URL if caching fails
      if (user.avatar) {
        setAvatarUrl(AvatarStorage.resolveAvatarUrl(user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvatar();
  }, [user.username, user.avatar]);

  return {
    avatarUrl,
    isLoading,
    error,
    reload: loadAvatar
  };
}; 