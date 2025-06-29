import React, { useState, useRef } from 'react';
import { Button } from './button';
import { UserAvatar } from './user-avatar';
import { Camera, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './alert';
import axios from 'axios';
import { API_BASE_URL } from '../interface/gloabL_var';

interface AvatarUploadProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  onAvatarUpdate: (newAvatarPath: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

const buttonSizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
  '2xl': 'h-12 w-12',
  '3xl': 'h-14 w-14'
};

const iconSizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
  '2xl': 'h-6 w-6',
  '3xl': 'h-7 w-7'
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  user,
  onAvatarUpdate,
  size = '2xl',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post(
        `${API_BASE_URL}/db/upload-avatar?token=${token.replace(/"/g, '')}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        const newAvatarPath = response.data.avatar_path;
        onAvatarUpdate(newAvatarPath);
        // Remove success message - just update the avatar silently
        
        // Clear preview after successful upload
        setTimeout(() => {
          setPreviewUrl(null);
        }, 2000);
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setError(error.response?.data?.detail || 'Failed to upload avatar. Please try again.');
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

  const currentAvatar = previewUrl || user.avatar;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Avatar Display */}
      <div className="relative">
        <UserAvatar
          user={{ ...user, avatar: currentAvatar }}
          size={size}
          className="border-4 border-orange-500"
        />
        
        {/* Upload Button - Positioned closer to avatar */}
        <Button
          onClick={handleUploadClick}
          disabled={isUploading}
          className={`absolute -bottom-1 -right-1 ${buttonSizeClasses[size]} p-0 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border-2 border-white`}
          size="sm"
        >
          {isUploading ? (
            <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
          ) : (
            <Camera className={iconSizeClasses[size]} />
          )}
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {/* Error Messages Only */}
      {error && (
        <Alert className="mt-2 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        <p>Click camera icon to upload</p>
        <p>Max 5MB • JPEG, PNG, WebP</p>
      </div>
    </div>
  );
};

export default AvatarUpload;