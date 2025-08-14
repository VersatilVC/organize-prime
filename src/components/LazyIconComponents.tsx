import React, { lazy, Suspense, useState, useEffect } from 'react';
import { ComponentLoadingSkeleton } from './LoadingSkeletons';

interface LazyIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function LazyIcon({ name, size = 16, color = 'currentColor', className }: LazyIconProps) {
  const [IconComponent, setIconComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadIcon = async () => {
      try {
        setLoading(true);
        setError(false);

        const dynamicIconImports = (await import('lucide-react/dynamicIconImports')).default as Record<string, any>;
        const importer = dynamicIconImports[name] || dynamicIconImports['help-circle'];
        const mod = await importer();
        setIconComponent(() => (mod as any).default);
      } catch (err) {
        console.warn(`Failed to load icon: ${name}`, err);
        setError(true);
        const iconModule = await import('lucide-react');
        setIconComponent(() => (iconModule as any).HelpCircle);
      } finally {
        setLoading(false);
      }
    };

    loadIcon();
  }, [name]);

  if (loading) {
    return (
      <div 
        className={className}
        style={{ width: size, height: size }}
      >
        <div className="animate-pulse bg-muted rounded" style={{ width: size, height: size }} />
      </div>
    );
  }

  if (error || !IconComponent) {
    return (
      <div 
        className={className}
        style={{ width: size, height: size }}
      >
        <div className="bg-muted rounded flex items-center justify-center" style={{ width: size, height: size }}>
          ?
        </div>
      </div>
    );
  }

  return (
    <IconComponent 
      size={size} 
      color={color} 
      className={className}
    />
  );
}

// HOC for lazy loading heavy components
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = lazy(importFunc);
  const FallbackComponent = fallback || ComponentLoadingSkeleton;

  return function WrappedComponent(props: P) {
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

// Note: Chart functionality moved to ChartWidget component to prevent bundle conflicts

// Lazy date picker component
export function LazyDatePicker({ onSelect, ...props }: any) {
  const [DatePicker, setDatePicker] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDatePicker = async () => {
      try {
        const dateFns = await import('date-fns');
        const component = await import('@/components/ui/calendar');
        
        setDatePicker(() => component.Calendar);
      } catch (error) {
        console.error('Failed to load date picker:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDatePicker();
  }, []);

  if (loading || !DatePicker) {
    return <ComponentLoadingSkeleton />;
  }

  const { className, ...rest } = props;
  return <DatePicker onSelect={onSelect} className={`${className ?? ''} p-3 pointer-events-auto`} {...rest} />;
}

// Lazy table component with virtualization
export function LazyDataTable({ 
  data, 
  columns, 
  ...props 
}: { 
  data: any[];
  columns: any[];
  [key: string]: any;
}) {
  const [TableComponent, setTableComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTable = async () => {
      try {
        // Load table component (assuming we have a data table component)
        const component = await import('@/components/ui/table');
        setTableComponent(() => component.Table);
      } catch (error) {
        console.error('Failed to load table component:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTable();
  }, []);

  if (loading || !TableComponent) {
    return <ComponentLoadingSkeleton />;
  }

  return <TableComponent data={data} columns={columns} {...props} />;
}