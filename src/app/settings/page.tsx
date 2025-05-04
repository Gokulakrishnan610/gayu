'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const SettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [sensorIp, setSensorIp] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isClient, setIsClient] = useState(false);

  // Load settings from localStorage on component mount (client-side only)
  useEffect(() => {
    setIsClient(true);
    const storedIp = localStorage.getItem('sensorIp') || '';
    const storedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    setSensorIp(storedIp);
    setTheme(storedTheme);
    // Apply initial theme class
    document.documentElement.classList.toggle('dark', storedTheme === 'dark');
  }, []);

  const handleIpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSensorIp(event.target.value);
  };

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
     toast({
      title: "Theme Changed",
      description: `Switched to ${newTheme} mode.`,
    });
  };

  const handleSaveIp = () => {
    localStorage.setItem('sensorIp', sensorIp);
    toast({
      title: "Sensor IP Saved",
      description: `Sensor IP address set to ${sensorIp || 'Default (Mock Data)'}.`,
    });
     // Optionally trigger a refresh or state update in other components if needed
  };

  if (!isClient) {
    // Render nothing or a placeholder on the server
    return null; // Or return a loading skeleton
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold text-primary">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sensor Configuration</CardTitle>
          <CardDescription>
            Enter the IP address of your ESP32 sensor. Leave blank to use mock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sensor-ip">Sensor IP Address</Label>
            <div className="flex space-x-2">
               <Input
                 id="sensor-ip"
                 type="text"
                 placeholder="e.g., 192.168.1.100"
                 value={sensorIp}
                 onChange={handleIpChange}
                 className="flex-grow"
               />
                <Button onClick={handleSaveIp}>Save IP</Button>
            </div>
             <p className="text-xs text-muted-foreground">
               App needs to be refreshed after saving IP for changes to potentially take effect on the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="theme-toggle" className="flex flex-col space-y-1">
              <span>Dark Mode</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Toggle between light and dark themes.
              </span>
            </Label>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeChange}
              aria-label="Toggle dark mode"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
