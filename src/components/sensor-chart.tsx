'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { SensorData } from '@/services/sensor';

interface SensorChartProps {
  data: SensorData[];
}

const chartConfig = {
  temperature: {
    label: 'Temperature (°C)',
    color: 'hsl(var(--chart-1))', // Use theme color
  },
  humidity: {
    label: 'Humidity (%)',
    color: 'hsl(var(--chart-2))', // Use theme color
  },
} satisfies ChartConfig;

const SensorChart: React.FC<SensorChartProps> = ({ data }) => {
  // Add a simple timestamp or index if needed for XAxis
  const chartData = data.map((item, index) => ({
    ...item,
    name: `Reading ${index + 1}`, // Simple index as name
    // You could add a real timestamp here if available
    // timestamp: new Date().toLocaleTimeString()
  }));

  if (!data || data.length < 2) {
     return <p className="text-muted-foreground text-center py-4">Need at least two data points to draw a chart.</p>;
   }


  return (
     <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 10, // Adjusted margin
            left: -15, // Adjusted margin to bring Y-axis closer
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name" // Use the simple name/index for X axis labels
            // Or use timestamp if available: dataKey="timestamp"
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--chart-1))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}°C`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--chart-2))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
          />
           <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="var(--color-temperature)"
            strokeWidth={2}
            dot={false} // Hide dots for a cleaner look
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="humidity"
            stroke="var(--color-humidity)"
            strokeWidth={2}
            dot={false} // Hide dots for a cleaner look
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
     </ChartContainer>
  );
};

export default SensorChart;
