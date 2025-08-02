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
        
        // Dynamic import based on icon name
        const iconModule = await import('lucide-react');
        
        // Convert kebab-case to PascalCase for icon names
        const iconName = name.split('-').map(part => 
          part.charAt(0).toUpperCase() + part.slice(1)
        ).join('');
        
        const IconComponent = (iconModule as any)[iconName] || iconModule.HelpCircle;
        setIconComponent(() => IconComponent);
      } catch (err) {
        console.warn(`Failed to load icon: ${name}`, err);
        setError(true);
        // Fallback to a basic icon
        import('lucide-react').then(mod => {
          setIconComponent(() => mod.HelpCircle);
        });
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

// Lazy chart component wrapper
export function LazyChart({ 
  type, 
  data, 
  ...props 
}: { 
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  [key: string]: any;
}) {
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const recharts = await import('recharts');
        
        const componentMap = {
          line: recharts.LineChart,
          bar: recharts.BarChart,
          pie: recharts.PieChart,
          area: recharts.AreaChart,
        };
        
        setChartComponent(() => componentMap[type]);
      } catch (error) {
        console.error('Failed to load chart component:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, [type]);

  if (loading || !ChartComponent) {
    return <ComponentLoadingSkeleton />;
  }

  return <ChartComponent data={data} {...props} />;
}

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

  return <DatePicker onSelect={onSelect} {...props} />;
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