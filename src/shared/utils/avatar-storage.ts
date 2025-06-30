// Persistent Avatar Storage using localStorage
interface StoredAvatar {
  dataUrl: string;
  timestamp: number;
  username: string;
  originalPath?: string;
}

class AvatarStorage {
  private static readonly STORAGE_KEY = 'h2h_user_avatars';
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB total limit
  
  /**
   * Save avatar image to localStorage as base64
   */
  static async saveAvatar(username: string, file: File): Promise<string> {
    try {
      // Convert file to base64 data URL
      const dataUrl = await this.fileToDataUrl(file);
      
      // Check if we have enough storage space
      const hasSpace = await this.checkStorageQuota(dataUrl.length);
      if (!hasSpace) {
        // Clean up user storage first
        this.cleanupUserStorageData();
      }
      
      // Check storage size before saving
      await this.ensureStorageSpace(dataUrl.length);
      
      const avatarData: StoredAvatar = {
        dataUrl,
        timestamp: Date.now(),
        username,
      };
      
      const stored = this.getAllAvatars();
      stored[username] = avatarData;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      
      console.log(`[AvatarStorage] Saved avatar for ${username} to localStorage`);
      return dataUrl;
    } catch (error) {
      console.error('[AvatarStorage] Failed to save avatar:', error);
      throw error;
    }
  }
  
  /**
   * Get avatar from localStorage
   */
  static getAvatar(username: string): string | null {
    try {
      const stored = this.getAllAvatars();
      const avatarData = stored[username];
      
      if (!avatarData) {
        return null;
      }
      
      return avatarData.dataUrl;
    } catch (error) {
      console.error('[AvatarStorage] Failed to get avatar:', error);
      return null;
    }
  }
  
  /**
   * Remove avatar from localStorage
   */
  static removeAvatar(username: string): void {
    try {
      const stored = this.getAllAvatars();
      delete stored[username];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      
      console.log(`[AvatarStorage] Removed avatar for ${username}`);
    } catch (error) {
      console.error('[AvatarStorage] Failed to remove avatar:', error);
    }
  }
  
  /**
   * Check if user has a locally stored avatar
   */
  static hasAvatar(username: string): boolean {
    try {
      const stored = this.getAllAvatars();
      return !!stored[username];
    } catch (error) {
      console.error('[AvatarStorage] Failed to check avatar existence:', error);
      return false;
    }
  }
  
  /**
   * Get all stored avatars
   */
  private static getAllAvatars(): Record<string, StoredAvatar> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('[AvatarStorage] Failed to parse stored avatars:', error);
      return {};
    }
  }
  
  /**
   * Convert file to base64 data URL
   */
  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Ensure there's enough storage space
   */
  private static async ensureStorageSpace(newDataSize: number): Promise<void> {
    try {
      const stored = this.getAllAvatars();
      const currentSize = JSON.stringify(stored).length;
      
      // If adding this would exceed limit, remove oldest avatars
      if (currentSize + newDataSize > this.MAX_STORAGE_SIZE) {
        const avatarEntries = Object.entries(stored);
        
        // Sort by timestamp (oldest first)
        avatarEntries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        // Remove oldest avatars until we have enough space
        let removedSize = 0;
        for (const [username, data] of avatarEntries) {
          delete stored[username];
          removedSize += data.dataUrl.length;
          
          console.log(`[AvatarStorage] Removed old avatar for ${username} to free space`);
          
          if (currentSize - removedSize + newDataSize <= this.MAX_STORAGE_SIZE) {
            break;
          }
        }
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      }
    } catch (error) {
      console.error('[AvatarStorage] Failed to ensure storage space:', error);
    }
  }
  
  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalAvatars: number;
    storageSize: string;
    usernames: string[];
  } {
    try {
      const stored = this.getAllAvatars();
      const usernames = Object.keys(stored);
      const storageSize = this.formatBytes(JSON.stringify(stored).length);
      
      return {
        totalAvatars: usernames.length,
        storageSize,
        usernames,
      };
    } catch (error) {
      console.error('[AvatarStorage] Failed to get storage stats:', error);
      return { totalAvatars: 0, storageSize: '0 B', usernames: [] };
    }
  }
  
  /**
   * Clear all stored avatars
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[AvatarStorage] Cleared all avatars');
    } catch (error) {
      console.error('[AvatarStorage] Failed to clear avatars:', error);
    }
  }
  
  /**
   * Format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Resolve avatar URL with localStorage fallback
   */
  static resolveAvatarUrl(user: { username: string; avatar?: string | null }): string | null {
    // First check localStorage for persistent avatar
    const localAvatar = this.getAvatar(user.username);
    if (localAvatar) {
      return localAvatar;
    }
    
    // Fallback to server avatar if available (but not if it's our persistent marker)
    if (user.avatar && user.avatar.trim() !== '' && !user.avatar.startsWith('persistent_')) {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      if (user.avatar.startsWith('/')) {
        return `http://localhost:8000${user.avatar}`;
      }
      return `http://localhost:8000/avatars/${user.avatar}`;
    }
    
    return null;
  }
  
  /**
   * Cache server avatar locally for persistence
   */
  static async cacheServerAvatar(username: string, avatarUrl: string): Promise<void> {
    try {
      // Don't cache if already exists locally
      if (this.hasAvatar(username)) {
        return;
      }
      
      const response = await fetch(avatarUrl);
      const blob = await response.blob();
      
      // Convert blob to file-like object for processing
      const file = new File([blob], 'avatar.jpg', { type: blob.type });
      await this.saveAvatar(username, file);
      
      console.log(`[AvatarStorage] Cached server avatar for ${username}`);
    } catch (error) {
      console.error('[AvatarStorage] Failed to cache server avatar:', error);
    }
  }
  
  /**
   * Clean up localStorage user data that contains base64 avatar data
   */
  static cleanupUserStorageData(): void {
    try {
      const userDataStr = localStorage.getItem('user');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        
        // If user avatar contains base64 data, replace it with persistent marker
        if (userData.avatar && userData.avatar.startsWith('data:image')) {
          userData.avatar = `persistent_${userData.username}`;
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('[AvatarStorage] Cleaned up user localStorage data');
        }
      }
    } catch (error) {
      console.error('[AvatarStorage] Failed to cleanup user storage:', error);
    }
  }
  
  /**
   * Check if localStorage has enough space for new avatar
   */
  static async checkStorageQuota(newDataSize: number): Promise<boolean> {
    try {
      // Try to estimate current localStorage usage
      let currentSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          currentSize += localStorage[key].length + key.length;
        }
      }
      
      // Typical localStorage limit is 5-10MB, we'll use 5MB as safe limit
      const SAFE_STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
      
      if (currentSize + newDataSize > SAFE_STORAGE_LIMIT) {
        console.warn('[AvatarStorage] Storage quota would be exceeded');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[AvatarStorage] Failed to check storage quota:', error);
      return false;
    }
  }
}

export default AvatarStorage; 