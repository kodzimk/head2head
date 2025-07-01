// Persistent Avatar Storage using IndexedDB with folder-like structure
import { API_BASE_URL } from '../interface/gloabL_var';

interface StoredAvatar {
  file: File;
  timestamp: number;
  username: string;
  path: string; // e.g., "avatars/john_doe/avatar.jpg"
  originalPath?: string;
}

class AvatarStorage {
  private static readonly DB_NAME = 'h2h_avatars_db';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'avatars';
  private static readonly AVATARS_FOLDER = 'avatars';
  private static readonly MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB total limit for avatar storage
  private static readonly SAFE_STORAGE_LIMIT = 30 * 1024 * 1024; // 30MB safe limit before cleanup
  
  private static dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize and get IndexedDB database
   */
  private static async getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          // Create object store with username as key
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'username' });
            store.createIndex('path', 'path', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      });
    }
    return this.dbPromise;
  }

  /**
   * Create avatar path based on username
   */
  private static createAvatarPath(username: string, fileExtension: string = 'jpg'): string {
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    return `${this.AVATARS_FOLDER}/${sanitizedUsername}/avatar.${fileExtension}`;
  }

  /**
   * Get file extension from file or default to jpg
   */
  private static getFileExtension(file: File): string {
    const extension = file.name.split('.').pop();
    return extension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension.toLowerCase()) 
      ? extension.toLowerCase() 
      : 'jpg';
  }

  /**
   * Save avatar file to IndexedDB organized by username path
   */
  static async saveAvatar(username: string, file: File): Promise<string> {
    try {
      const db = await this.getDB();
      const extension = this.getFileExtension(file);
      const avatarPath = this.createAvatarPath(username, extension);
      
      // Aggressive pre-cleanup to ensure space
      await this.aggressiveCleanup(file.size);
      
      const avatarData: StoredAvatar = {
        file,
        timestamp: Date.now(),
        username,
        path: avatarPath,
      };
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.put(avatarData);
        
        request.onsuccess = () => {
          console.log(`[AvatarStorage] Saved avatar for ${username} at path: ${avatarPath}`);
          // Return object URL for immediate use
          const objectURL = URL.createObjectURL(file);
          resolve(objectURL);
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to save avatar:', request.error);
          reject(new Error('Failed to save avatar to IndexedDB'));
        };
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to save avatar:', error);
      throw new Error('Failed to save avatar. Storage operation failed.');
    }
  }
  
  /**
   * Get avatar from IndexedDB by username
   */
  static async getAvatar(username: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.get(username);
        
        request.onsuccess = () => {
          const result = request.result as StoredAvatar | undefined;
          
          if (!result) {
            resolve(null);
            return;
          }
          
          // Create object URL from stored file
          const objectURL = URL.createObjectURL(result.file);
          resolve(objectURL);
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to get avatar:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to get avatar:', error);
      return null;
    }
  }
  
  /**
   * Remove avatar from IndexedDB
   */
  static async removeAvatar(username: string): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.delete(username);
        
        request.onsuccess = () => {
          console.log(`[AvatarStorage] Removed avatar for ${username}`);
          resolve();
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to remove avatar:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to remove avatar:', error);
    }
  }
  
  /**
   * Check if user has a locally stored avatar
   */
  static async hasAvatar(username: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.get(username);
        
        request.onsuccess = () => {
          resolve(!!request.result);
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to check avatar existence:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to check avatar existence:', error);
      return false;
    }
  }
  
  /**
   * Get all stored avatars (for migration/management)
   */
  private static async getAllAvatars(): Promise<Record<string, StoredAvatar>> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve) => {
        const transaction = db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = () => {
          const avatars = request.result as StoredAvatar[];
          const result: Record<string, StoredAvatar> = {};
          
          avatars.forEach(avatar => {
            result[avatar.username] = avatar;
          });
          
          resolve(result);
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to get all avatars:', request.error);
          resolve({});
        };
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to get all avatars:', error);
      return {};
    }
  }

  /**
   * Get storage statistics
   */
  static async getStorageStats(): Promise<{
    totalAvatars: number;
    storageSize: string;
    usernames: string[];
    paths: string[];
  }> {
    try {
      const stored = await this.getAllAvatars();
      const usernames = Object.keys(stored);
      const paths = Object.values(stored).map(avatar => avatar.path);
      
      let totalSize = 0;
      Object.values(stored).forEach(avatar => {
        totalSize += avatar.file.size;
      });
      
      return {
        totalAvatars: usernames.length,
        storageSize: this.formatBytes(totalSize),
        usernames,
        paths,
      };
    } catch (error) {
      console.error('[AvatarStorage] Failed to get storage stats:', error);
      return { totalAvatars: 0, storageSize: '0 B', usernames: [], paths: [] };
    }
  }
  
  /**
   * Clear all stored avatars
   */
  static async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('[AvatarStorage] Cleared all avatars');
          resolve();
        };
        
        request.onerror = () => {
          console.error('[AvatarStorage] Failed to clear avatars:', request.error);
          reject(request.error);
        };
      });
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
   * Resolve avatar URL for a user (backward compatibility)
   */
  static resolveAvatarUrl(user: { username: string; avatar?: string | null }): string | null {
    if (!user?.username) return null;
    
    // Check if user has a persistent avatar marker
    if (user.avatar && user.avatar.startsWith('persistent_')) {
      // For persistent avatars, we'll need to handle this asynchronously
      // Return a placeholder for now, components should handle async loading
      return null;
    }
    
    // Handle server avatars
    if (user.avatar && !user.avatar.startsWith('data:') && !user.avatar.startsWith('blob:')) {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      return `${API_BASE_URL}${user.avatar}`;
    }
    
    // Handle blob URLs or data URLs
    if (user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('blob:'))) {
      return user.avatar;
    }
    
    return null;
  }

  /**
   * Comprehensive avatar resolution with priority: local → server → null
   * This is the main function components should use for proper avatar display
   */
  static async resolveAvatarUrlAsync(user: { username: string; avatar?: string | null }): Promise<string | null> {
    if (!user?.username) return null;
    
    try {
      // Priority 1: Try to get locally stored avatar first
      const localAvatar = await this.getAvatar(user.username);
      if (localAvatar) {
        console.log(`[AvatarStorage] Using local avatar for ${user.username}`);
        return localAvatar;
      }
      
      // Priority 2: Try server avatar if no local avatar
      if (user.avatar && !user.avatar.startsWith('data:') && !user.avatar.startsWith('blob:')) {
        let serverUrl = user.avatar;
        
        // Build full URL if needed
        if (!serverUrl.startsWith('http')) {
          serverUrl = serverUrl.startsWith('/') 
            ? `${API_BASE_URL}${serverUrl}` 
            : `${API_BASE_URL}/avatars/${serverUrl}`;
        }
        
        console.log(`[AvatarStorage] Using server avatar for ${user.username}: ${serverUrl}`);
        return serverUrl;
      }
      
      // Priority 3: Handle blob/data URLs
      if (user.avatar && (user.avatar.startsWith('data:') || user.avatar.startsWith('blob:'))) {
        return user.avatar;
      }
      
      return null;
    } catch (error) {
      console.error(`[AvatarStorage] Failed to resolve avatar for ${user.username}:`, error);
      return null;
    }
  }

  /**
   * Get avatar URL asynchronously for persistent avatars
   */
  static async getAvatarUrl(username: string): Promise<string | null> {
    try {
      const avatarUrl = await this.getAvatar(username);
      return avatarUrl;
    } catch (error) {
      console.error('[AvatarStorage] Failed to get avatar URL:', error);
      return null;
    }
  }

  /**
   * Cache server avatar locally with path organization
   */
  static async cacheServerAvatar(username: string, avatarUrl: string): Promise<void> {
    try {
      const response = await fetch(avatarUrl);
      if (!response.ok) return;
      
      const blob = await response.blob();
      const file = new File([blob], 'avatar.jpg', { type: blob.type });
      
      await this.saveAvatar(username, file);
      console.log(`[AvatarStorage] Cached server avatar for ${username} at path: ${this.createAvatarPath(username)}`);
    } catch (error) {
      console.warn('[AvatarStorage] Failed to cache server avatar:', error);
    }
  }
  
  /**
   * Clean up old user data from localStorage (migration helper)
   */
  static cleanupUserStorageData(): void {
    try {
      // Remove old localStorage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('avatar') || key.includes('h2h_user_avatars'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`[AvatarStorage] Cleaned up old localStorage key: ${key}`);
      });
    } catch (error) {
      console.error('[AvatarStorage] Failed to cleanup old storage data:', error);
    }
  }
  
  /**
   * Aggressive cleanup to ensure storage space using file size
   */
  private static async aggressiveCleanup(newFileSize: number): Promise<void> {
    try {
      const usage = await this.getStorageUsage();
      
      if (usage.totalBytes + newFileSize > this.SAFE_STORAGE_LIMIT) {
        console.log('[AvatarStorage] Storage approaching limit, performing aggressive cleanup');
        
        const stored = await this.getAllAvatars();
        const avatarEntries = Object.entries(stored);
        
        // Sort by timestamp (oldest first)
        avatarEntries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        // Remove oldest avatars until we have enough space
        let removedSize = 0;
        for (const [username, data] of avatarEntries) {
          await this.removeAvatar(username);
          removedSize += data.file.size;
          
          console.log(`[AvatarStorage] Removed old avatar for ${username} (${this.formatBytes(data.file.size)}) to free space`);
          
          if (usage.totalBytes - removedSize + newFileSize <= this.SAFE_STORAGE_LIMIT) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('[AvatarStorage] Failed to perform aggressive cleanup:', error);
    }
  }
  
  
  
  /**
   * Get current storage usage in bytes
   */
  static async getStorageUsage(): Promise<{ totalBytes: number; avatarBytes: number; percentage: number }> {
    try {
      const stored = await this.getAllAvatars();
      
      let avatarBytes = 0;
      Object.values(stored).forEach(avatar => {
        avatarBytes += avatar.file.size;
      });
      
      const totalBytes = avatarBytes; // In IndexedDB, we only track avatar storage
      const percentage = (totalBytes / this.MAX_STORAGE_SIZE) * 100;
      
      return { totalBytes, avatarBytes, percentage };
    } catch (error) {
      console.error('[AvatarStorage] Failed to get storage usage:', error);
      return { totalBytes: 0, avatarBytes: 0, percentage: 0 };
    }
  }
  
  /**
   * Migrate avatar from old username to new username with path update
   */
  static async migrateAvatar(oldUsername: string, newUsername: string): Promise<void> {
    try {
      console.log(`[AvatarStorage] Migrating avatar from "${oldUsername}" to "${newUsername}"`);
      
      const db = await this.getDB();
      
      // Get old avatar data
      const transaction1 = db.transaction([this.STORE_NAME], 'readonly');
      const store1 = transaction1.objectStore(this.STORE_NAME);
      const getRequest = store1.get(oldUsername);
      
      getRequest.onsuccess = async () => {
        const oldAvatarData = getRequest.result as StoredAvatar | undefined;
        
        if (!oldAvatarData) {
          console.log(`[AvatarStorage] No avatar found for "${oldUsername}" to migrate`);
          return;
        }
        
        // Create new avatar data with updated path and username
        const extension = this.getFileExtension(oldAvatarData.file);
        const newPath = this.createAvatarPath(newUsername, extension);
        
        const newAvatarData: StoredAvatar = {
          ...oldAvatarData,
          username: newUsername,
          path: newPath,
          timestamp: Date.now(), // Update timestamp
        };
        
        // Save new avatar data
        const transaction2 = db.transaction([this.STORE_NAME], 'readwrite');
        const store2 = transaction2.objectStore(this.STORE_NAME);
        
        store2.put(newAvatarData);
        store2.delete(oldUsername);
        
        console.log(`[AvatarStorage] Successfully migrated avatar from "${oldUsername}" to "${newUsername}"`);
        console.log(`[AvatarStorage] Updated path: ${oldAvatarData.path} -> ${newPath}`);
      };
      
      getRequest.onerror = () => {
        console.error('[AvatarStorage] Failed to migrate avatar:', getRequest.error);
      };
    } catch (error) {
      console.error('[AvatarStorage] Avatar migration failed:', error);
    }
  }
  
  /**
   * Update avatar URL reference for username change (backward compatibility)
   */
  static updateAvatarUrlForUsernameChange(oldUsername: string, newUsername: string, userObject: any): any {
    if (!userObject) return userObject;
    
    // Update avatar reference if it exists
    if (userObject.avatar && userObject.avatar.startsWith('persistent_')) {
      userObject.avatar = `persistent_${newUsername}`;
      console.log(`[AvatarStorage] Updated avatar reference from "persistent_${oldUsername}" to "persistent_${newUsername}"`);
    }
    
    return userObject;
  }
}

export default AvatarStorage; 