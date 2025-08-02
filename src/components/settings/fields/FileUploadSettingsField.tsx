import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, Loader2, Building, Image as ImageIcon, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FileUploadSettingsFieldProps {
  id: string;
  label: string;
  value?: string | null;
  onChange: (url: string) => void;
  bucket: string;
  path: string;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  error?: string;
  description?: string;
  className?: string;
  variant?: 'avatar' | 'logo' | 'image';
  fallbackIcon?: 'user' | 'building' | 'image';
  dimensions?: { width: number; height: number };
}

export function FileUploadSettingsField({
  id,
  label,
  value,
  onChange,
  bucket,
  path,
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'],
  disabled = false,
  error,
  description,
  className,
  variant = 'image',
  fallbackIcon = 'image',
  dimensions = { width: 120, height: 60 }
}: FileUploadSettingsFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const getFallbackIcon = () => {
    const iconProps = { className: "h-8 w-8 text-muted-foreground" };
    switch (fallbackIcon) {
      case 'user': return <User {...iconProps} />;
      case 'building': return <Building {...iconProps} />;
      default: return <ImageIcon {...iconProps} />;
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File',
        description: `Please upload a ${acceptedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')} image`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: `Image must be smaller than ${maxSize}MB`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      onChange(publicUrl);
      
      toast({
        title: 'Success',
        description: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [acceptedTypes, maxSize, bucket, path, onChange, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const renderPreview = () => {
    if (variant === 'avatar') {
      return (
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={value || undefined} alt={label} />
            <AvatarFallback className="text-lg">
              {getFallbackIcon()}
            </AvatarFallback>
          </Avatar>
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative">
        <div 
          className="border-2 border-dashed border-muted-foreground rounded-lg flex items-center justify-center bg-muted/10 p-4"
          style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        >
          {value ? (
            <img 
              src={value} 
              alt={label}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            getFallbackIcon()
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor={id}>{label}</Label>
      
      <div className="flex items-center space-x-6">
        {renderPreview()}
        
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Upload {label}</span>
          </Button>
          
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}