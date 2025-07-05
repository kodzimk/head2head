import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';
import axios from 'axios';
import { API_BASE_URL } from '../interface/gloabL_var';
import AvatarStorage from '../utils/avatar-storage';
import { UploadAvatar } from './upload-avatar';
import { useTranslation } from 'react-i18next';

interface AvatarUploadProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  onAvatarUpdate: (newAvatarPath: string) => void;
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  user,
  onAvatarUpdate,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Force language reload on mount
  useEffect(() => {
    const currentLang = i18n.language;
    i18n.reloadResources(currentLang).then(() => {
      console.log('Language resources reloaded:', currentLang);
      console.log('Translation key after reload:', t('profile.avatar.button.change'));
    });
  }, []);

  // Load current avatar asynchronously
  useEffect(() => {
    const loadCurrentAvatar = async () => {
      const resolvedUrl = await AvatarStorage.resolveAvatarUrlAsync(user);
      setCurrentAvatarUrl(resolvedUrl);
    };
    
    if (user?.username) {
      loadCurrentAvatar();
    }
  }, [user?.username, user?.avatar]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t('profile.settings.profile.avatar.errors.invalid_type');
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return t('profile.settings.profile.avatar.errors.too_large');
    }
    
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Clear previous messages
    setError(null);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Save file locally and upload to server
    setIsUploading(true);
    try {
      // First save to localStorage for persistence
      const localAvatarUrl = await AvatarStorage.saveAvatar(user.username, file);
      
      // Update UI immediately with local avatar
      onAvatarUpdate(localAvatarUrl);
      setCurrentAvatarUrl(localAvatarUrl);
      
      // Also upload to server in background
      try {
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('access_token');
        if (token) {
          const response = await axios.post(
            `${API_BASE_URL}/db/upload-avatar?token=${token.replace(/"/g, '')}`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              timeout: 30000,
            }
          );
          
          if (response.status === 200) {
            console.log('[AvatarUpload] Avatar also uploaded to server:', response.data.avatar_path);
          }
        }
      } catch (serverError) {
        console.warn('[AvatarUpload] Server upload failed, but local avatar saved:', serverError);
      }
      
      // Clear any previous errors
      setError(null);
      
      // Clear preview after successful save
      setTimeout(() => {
        setPreviewUrl(null);
      }, 1500);
      
      console.log('[AvatarUpload] Avatar saved locally for', user.username);
    } catch (error: any) {
      let errorMessage = 'Failed to save avatar. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const displayAvatarUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={`flex flex-col items-center space-y-4 sm:space-y-6 ${className}`}>
      {/* Enhanced Avatar Display using specialized UploadAvatar component */}
      <div className="relative">
        <UploadAvatar
          user={{ 
            username: user.username, 
            avatar: displayAvatarUrl || user.avatar 
          }}
          size="xl"
          showBorder={true}
          showGlow={true}
          className="shadow-lg sm:shadow-xl md:shadow-2xl"
        />
        
        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUploadClick}
        disabled={isUploading}
        variant="outline"
        size="sm"
        className="w-full max-w-[160px] sm:max-w-[180px] md:max-w-[200px] 
                 bg-white/90 hover:bg-white dark:bg-gray-800 dark:hover:bg-gray-700 
                 border-2 border-orange-500 text-orange-600 hover:text-orange-700 
                 px-4 sm:px-5 md:px-6 py-1.5 sm:py-2 
                 rounded-lg transition-all duration-200 shadow-sm hover:scale-105
                 text-sm sm:text-base"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
            {t('profile.settings.profile.avatar.button.uploading')}
          </>
        ) : (
          <>
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            {t('profile.settings.profile.avatar.button.change')}
          </>
        )}
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
        aria-label={t('profile.settings.profile.avatar.button.change')}
      />

      {/* Error Messages */}
      {error && (
        <Alert variant="destructive" className="mt-3 sm:mt-4">
          <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Info */}
      <div className="text-xs sm:text-sm text-gray-500 text-center max-w-[280px] sm:max-w-[320px]">
        <p>Max 5MB • JPEG, PNG, WebP</p>
      </div>
    </div>
  );
};

export default AvatarUpload;