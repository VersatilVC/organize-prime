import React, { useState, useEffect } from 'react';
import { ChartLoadingSkeleton } from '@/components/LoadingSkeletons';

interface LazyChartProps {
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  width?: number;
  height?: number;
  className?: string;
  [key: string]: any;
}

export function ChartWidget({ type, data, width = 400, height = 200, className, ...props }: LazyChartProps) {
  const [chartComponents, setChartComponents] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChartLibrary = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamically import recharts
        const recharts = await import('recharts');
        
        setChartComponents({
          LineChart: recharts.LineChart,
          BarChart: recharts.BarChart,
          PieChart: recharts.PieChart,
          AreaChart: recharts.AreaChart,
          XAxis: recharts.XAxis,
          YAxis: recharts.YAxis,
          CartesianGrid: recharts.CartesianGrid,
          Tooltip: recharts.Tooltip,
          Legend: recharts.Legend,
          Line: recharts.Line,
          Bar: recharts.Bar,
          Area: recharts.Area,
          Cell: recharts.Cell,
          ResponsiveContainer: recharts.ResponsiveContainer,
        });
      } catch (err) {
        console.error('Failed to load chart library:', err);
        setError('Failed to load chart component');
      } finally {
        setLoading(false);
      }
    };

    loadChartLibrary();
  }, []);

  if (loading) {
    return <ChartLoadingSkeleton />;
  }

  if (error || !chartComponents) {
    return (
      <div className="flex items-center justify-center h-48 border rounded-md">
        <p className="text-sm text-muted-foreground">Unable to load chart</p>
      </div>
    );
  }

  const { 
    LineChart, 
    BarChart, 
    PieChart, 
    AreaChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line,
    Bar,
    Area,
    Cell,
    ResponsiveContainer
  } = chartComponents;

  const renderChart = () => {
    const commonProps = {
      data,
      width,
      height,
      ...props
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Tooltip />
            <Legend />
            {/* Note: PieChart implementation would need different data structure */}
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

// Predefined chart components for common use cases
export function DashboardLineChart({ data, ...props }: Omit<LazyChartProps, 'type'>) {
  return <ChartWidget type="line" data={data} {...props} />;
}

export function DashboardBarChart({ data, ...props }: Omit<LazyChartProps, 'type'>) {
  return <ChartWidget type="bar" data={data} {...props} />;
}

export function DashboardAreaChart({ data, ...props }: Omit<LazyChartProps, 'type'>) {
  return <ChartWidget type="area" data={data} {...props} />;
}

export function DashboardPieChart({ data, ...props }: Omit<LazyChartProps, 'type'>) {
  return <ChartWidget type="pie" data={data} {...props} />;
}