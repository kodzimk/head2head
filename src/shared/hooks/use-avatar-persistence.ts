import { useEffect, useState } from 'react';
import AvatarStorage from '../utils/avatar-storage';

interface User {
  username: string;
  avatar?: string | null;
}

/**
 * Hook to manage persistent avatar storage and loading
 */
export const useAvatarPersistence = (user: User) => {
  const [persistentAvatarUrl, setPersistentAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user.username) {
      // Try to get locally stored avatar first
      const localAvatar = AvatarStorage.getAvatar(user.username);
      
      if (localAvatar) {
        setPersistentAvatarUrl(localAvatar);
        setIsLoading(false);
      } else if (user.avatar) {
        // If no local avatar but server avatar exists, cache it
        const cacheServerAvatar = async () => {
          try {
            let serverUrl = user.avatar;
            
            // Construct full URL if needed
            if (serverUrl && !serverUrl.startsWith('http')) {
              if (serverUrl.startsWith('/')) {
                serverUrl = `http://localhost:8000${serverUrl}`;
              } else {
                serverUrl = `http://localhost:8000/avatars/${serverUrl}`;
              }
            }
            
            if (serverUrl) {
              await AvatarStorage.cacheServerAvatar(user.username, serverUrl);
              const cachedAvatar = AvatarStorage.getAvatar(user.username);
              setPersistentAvatarUrl(cachedAvatar);
            }
          } catch (error) {
            console.warn('[useAvatarPersistence] Failed to cache server avatar:', error);
            setPersistentAvatarUrl(AvatarStorage.resolveAvatarUrl(user));
          } finally {
            setIsLoading(false);
          }
        };
        
        cacheServerAvatar();
      } else {
        setPersistentAvatarUrl(null);
        setIsLoading(false);
      }
    } else {
      setPersistentAvatarUrl(null);
      setIsLoading(false);
    }
  }, [user.username, user.avatar]);

  const updateAvatar = async (file: File) => {
    try {
      const localAvatarUrl = await AvatarStorage.saveAvatar(user.username, file);
      setPersistentAvatarUrl(localAvatarUrl);
      return localAvatarUrl;
    } catch (error) {
      console.error('[useAvatarPersistence] Failed to update avatar:', error);
      throw error;
    }
  };

  const removeAvatar = () => {
    AvatarStorage.removeAvatar(user.username);
    setPersistentAvatarUrl(null);
  };

  const getAvatarUrl = () => {
    return persistentAvatarUrl || AvatarStorage.resolveAvatarUrl(user);
  };

  return {
    avatarUrl: getAvatarUrl(),
    persistentAvatarUrl,
    isLoading,
    updateAvatar,
    removeAvatar,
    hasLocalAvatar: AvatarStorage.hasAvatar(user.username),
  };
};

/**
 * Hook to get storage statistics
 */
export const useAvatarStorageStats = () => {
  const [stats, setStats] = useState(AvatarStorage.getStorageStats());

  const refreshStats = () => {
    setStats(AvatarStorage.getStorageStats());
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return {
    ...stats,
    refreshStats,
    clearAll: () => {
      AvatarStorage.clearAll();
      refreshStats();
    },
  };
};

export default useAvatarPersistence; 