import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';
import axios from 'axios';
import { API_BASE_URL } from '../interface/gloabL_var';
import AvatarStorage from '../utils/avatar-storage';
import { UserAvatar } from './user-avatar';

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
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return 'Please select a valid image file (JPEG, PNG, or WebP)';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
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
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Enhanced Avatar Display using UserAvatar component */}
      <div className="relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:w-32">
          <UserAvatar
            user={{ 
              username: user.username, 
              avatar: displayAvatarUrl || user.avatar 
            }}
            size="4xl"
            variant="default"
            showBorder={true}
            className="border-4 border-orange-500/20 shadow-lg"
          />
        </div>
        
        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <Button
        onClick={handleUploadClick}
        disabled={isUploading}
        variant="outline"
        size="sm"
        className="bg-white hover:bg-gray-50 border-2 border-orange-500 text-orange-600 hover:text-orange-700 px-4 py-2 rounded-lg transition-all duration-200"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Change Avatar
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
      />

      {/* Error Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50 max-w-xs">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Info */}
      <div className="text-xs text-gray-500 text-center max-w-xs">
        <p>Max 5MB • JPEG, PNG, WebP</p>
      </div>
    </div>
  );
};

export default AvatarUpload;