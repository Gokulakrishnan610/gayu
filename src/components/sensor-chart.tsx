'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
// Import the SensorData type allowing nulls
import type { SensorData } from '@/services/sensor';

// Define the expected data shape for the chart *after* filtering nulls
interface ValidSensorData {
  temperature: number;
  humidity: number;
  name: string; // Added for XAxis
}

interface SensorChartProps {
  // Accept data that might contain nulls initially
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
  // Filter out entries with null values and add index for XAxis
  const chartData: ValidSensorData[] = data
      .map((item, index) => ({
          ...item,
          name: ` ${index + 1}`, // Simple index as name (add space for better rendering)
      }))
      .filter((item): item is ValidSensorData => // Type predicate to ensure non-null values
           item.temperature !== null && item.humidity !== null
      );


  // Check if there are enough valid data points
   if (!chartData || chartData.length < 2) {
     return <p className="text-muted-foreground text-center py-4">Need at least two valid data points to draw a chart.</p>;
   }


  return (
     <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData} // Use the filtered data
          margin={{
            top: 5,
            right: 10, // Adjusted margin
            left: -15, // Adjusted margin to bring Y-axis closer
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" /> {/* Lighter grid */}
          <XAxis
            dataKey="name" // Use the simple name/index for X axis labels
            stroke="hsl(var(--foreground)/0.8)"
            fontSize={10} // Smaller font size
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd" // Ensure first and last labels are shown
            // tickCount={5} // Limit ticks if too crowded
          />
          <YAxis
            yAxisId="left"
            domain={['auto', 'auto']} // Auto-scale domain
            stroke="hsl(var(--chart-1))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}°C`}
            width={40} // Adjust width for labels
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={['auto', 'auto']} // Auto-scale domain
            stroke="hsl(var(--chart-2))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}%`}
            width={40} // Adjust width for labels
          />
           <ChartTooltip
             cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1, strokeDasharray: '3 3' }} // Dashed cursor line
             content={<ChartTooltipContent indicator='line' hideLabel />}
           />
          <Legend verticalAlign="top" height={36}/>
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="temperature"
            stroke="var(--color-temperature)"
            strokeWidth={2}
            dot={false}
             activeDot={{ r: 5, strokeWidth: 1, fill: 'hsl(var(--background))', stroke: 'var(--color-temperature)' }}
             name="Temperature" // Add name for Legend/Tooltip
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="humidity"
            stroke="var(--color-humidity)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 1, fill: 'hsl(var(--background))', stroke: 'var(--color-humidity)' }}
            name="Humidity" // Add name for Legend/Tooltip
          />
        </LineChart>
      </ResponsiveContainer>
     </ChartContainer>
  );
};

export default SensorChart;