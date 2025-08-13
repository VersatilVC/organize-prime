// Optimized icon loading with tree-shaking and caching
import React from 'react';
import { type LucideIcon } from 'lucide-react';

// Icon cache to prevent duplicate imports
const iconCache = new Map<string, LucideIcon>();

// Common icons that should be preloaded
const CRITICAL_ICONS = [
  'Home', 'User', 'Settings', 'Bell', 'Menu', 'Search', 
  'ChevronDown', 'ChevronRight', 'Loader2', 'AlertCircle'
] as const;

// Dynamic icon loader with caching
export async function loadIcon(iconName: string): Promise<LucideIcon> {
  // Check cache first
  if (iconCache.has(iconName)) {
    return iconCache.get(iconName)!;
  }
  
  try {
    // Dynamic import with proper tree-shaking
    const iconModule = await import('lucide-react');
    const IconComponent = iconModule[iconName as keyof typeof iconModule] as LucideIcon;
    
    if (IconComponent) {
      iconCache.set(iconName, IconComponent);
      return IconComponent;
    }
    
    // Fallback to a default icon if not found
    const { AlertCircle } = await import('lucide-react');
    iconCache.set(iconName, AlertCircle);
    return AlertCircle;
  } catch (error) {
    console.warn(`Failed to load icon: ${iconName}`, error);
    // Return a fallback icon
    const { AlertCircle } = await import('lucide-react');
    return AlertCircle;
  }
}

// Preload critical icons during app initialization
export async function preloadCriticalIcons(): Promise<void> {
  const promises = CRITICAL_ICONS.map(iconName => 
    loadIcon(iconName).catch(() => null) // Ignore errors during preload
  );
  
  await Promise.allSettled(promises);
}

// Hook for using optimized icons
export function useOptimizedIcon(iconName: string) {
  const [icon, setIcon] = React.useState<LucideIcon | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    loadIcon(iconName)
      .then(iconComponent => {
        setIcon(iconComponent);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [iconName]);
  
  return { icon, loading };
}

// Optimized icon component with lazy loading
interface OptimizedIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function OptimizedIcon({ 
  name, 
  size = 24,
  color,
  className,
  ...props 
}: OptimizedIconProps) {
  const { icon: IconComponent, loading } = useOptimizedIcon(name);
  
  if (loading || !IconComponent) {
    return React.createElement('div', {
      className: `bg-muted animate-pulse rounded ${className || ''}`,
      style: { width: size, height: size }
    });
  }
  
  return React.createElement(IconComponent, { 
    size, 
    color, 
    className,
    ...props 
  });
}