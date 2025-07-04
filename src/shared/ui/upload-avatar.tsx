import React from 'react';
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import AvatarStorage from "../utils/avatar-storage";

interface UploadAvatarProps {
  user: {
    username: string;
    avatar?: string | null;
  };
  className?: string;
  showBorder?: boolean;
  showGlow?: boolean;
  size?: 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  'lg': 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40',
  'xl': 'w-36 h-36 sm:w-40 sm:h-40 md:w-48 md:h-48',
  '2xl': 'w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56'
};

export const UploadAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  UploadAvatarProps
>(({ 
  user, 
  className = '', 
  showBorder = true, 
  showGlow = true,
  size = 'xl'
}, ref) => {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load avatar asynchronously
  React.useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.username) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const resolvedUrl = await AvatarStorage.resolveAvatarUrlAsync(user);
        setAvatarUrl(resolvedUrl);
      } catch (error) {
        console.error('[UploadAvatar] Failed to load avatar:', error);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, [user?.username, user?.avatar]);

  const containerClasses = `
    relative flex items-center justify-center 
    ${sizeClasses[size]}
    ${className}
  `.trim();

  const avatarClasses = `
    aspect-square w-full h-full rounded-full overflow-hidden
    ${showBorder ? 'border-2 sm:border-3 md:border-4 border-gradient-to-r from-primary to-primary-light' : ''}
    ${showGlow ? 'shadow-lg sm:shadow-xl md:shadow-2xl shadow-primary/30' : ''}
    transition-all duration-300 hover:shadow-2xl
  `.trim();

  const imageClasses = `
    w-full h-full object-cover
    transition-transform duration-200
    hover:scale-105
  `.trim();

  const fallbackClasses = `
    w-full h-full flex items-center justify-center 
    bg-muted text-muted-foreground 
    text-xl sm:text-2xl md:text-3xl 
    font-semibold uppercase
  `.trim();

  return (
    <div className={containerClasses}>
      <AvatarPrimitive.Root
        ref={ref}
        className={avatarClasses}
      >
        {avatarUrl && !isLoading ? (
          <AvatarPrimitive.Image
            src={avatarUrl}
            alt={user.username}
            className={imageClasses}
            style={{
              objectFit: 'cover',
              objectPosition: 'center'
            }}
          />
        ) : (
          <AvatarPrimitive.Fallback 
            className={fallbackClasses}
          >
            {user.username?.slice(0, 2)}
          </AvatarPrimitive.Fallback>
        )}
      </AvatarPrimitive.Root>
    </div>
  );
});

UploadAvatar.displayName = 'UploadAvatar';

export default UploadAvatar; 