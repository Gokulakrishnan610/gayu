'use client';

import type { NextPage } from 'next';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, Lightbulb, AlertTriangle, User, PawPrint } from 'lucide-react';
import { SensorData, getSensorData, SensorStatus, getSensorStatus } from '@/services/sensor';
import { generatePersonalizedSuggestions } from '@/ai/flows/generate-personalized-suggestions';
import { generateKidsAndPetsSuggestions } from '@/ai/flows/generate-kids-and-pets-suggestions';
import SensorChart from '@/components/sensor-chart';

const initialSensorData = { temperature: 0, humidity: 0 };

const Home: NextPage = () => {
  const [sensorData, setSensorData] = useState<SensorData>(initialSensorData);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus | null>(null);
  const [suggestions, setSuggestions] = useState<string>('');
  const [kidsSuggestions, setKidsSuggestions] = useState<string[]>([]);
  const [petsSuggestions, setPetsSuggestions] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);

  const fetchData = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [data, status] = await Promise.all([getSensorData(), getSensorStatus()]);
      setSensorData(data);
      setSensorStatus(status);
      setHistoricalData((prev) => [...prev.slice(-29), data]); // Keep last 30 readings
    } catch (err) {
      console.error('Error fetching sensor data:', err);
      setError('Failed to fetch sensor data. Please check the ESP32 connection.');
      // Keep previous data on error? Or reset? Resetting for now.
      // setSensorData(initialSensorData);
      // setSensorStatus(null);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchSuggestions = async (data: SensorData) => {
     if (!data || data.temperature === 0) return; // Don't fetch if no valid data
    setLoadingSuggestions(true);
    try {
      const [personalizedResult, kidsResult, petsResult] = await Promise.all([
        generatePersonalizedSuggestions({ temperature: data.temperature, humidity: data.humidity }),
        generateKidsAndPetsSuggestions({ temperature: data.temperature, humidity: data.humidity, mode: 'kids' }),
        generateKidsAndPetsSuggestions({ temperature: data.temperature, humidity: data.humidity, mode: 'pets' })
      ]);
      setSuggestions(personalizedResult.suggestions);
      setKidsSuggestions(kidsResult.suggestions);
      setPetsSuggestions(petsResult.suggestions);
    } catch (err) {
      console.error('Error fetching AI suggestions:', err);
      // Set a user-friendly error message or keep previous suggestions
      // setError('Failed to load AI suggestions.');
      setSuggestions('Could not load suggestions at this time.');
      setKidsSuggestions(['Could not load suggestions.']);
      setPetsSuggestions(['Could not load suggestions.']);
    } finally {
      setLoadingSuggestions(false);
    }
  };


   // Initial fetch
   useEffect(() => {
    fetchData();
  }, []);

  // Fetch suggestions when sensor data changes
  useEffect(() => {
    if (sensorData && sensorData.temperature !== 0) { // Only fetch if data is valid
        fetchSuggestions(sensorData);
    }
  }, [sensorData]);


  // Periodic fetch
  useEffect(() => {
    const intervalId = setInterval(fetchData, 30000); // Fetch every 30 seconds
    return () => clearInterval(intervalId);
  }, []);


  const getGeneralSuggestion = useMemo(() => {
    if (loadingData || !sensorData) return null;

    const { temperature, humidity } = sensorData;

    if (temperature > 30) {
      return { icon: '🥵', text: "It's getting hot! Stay hydrated or turn on a fan." };
    } else if (temperature < 15) {
      return { icon: '🥶', text: "Feeling chilly? Grab a blanket or a warm drink." };
    } else if (humidity < 40) {
      return { icon: '🌵', text: "Dry air – consider using a humidifier or watering plants." };
    } else if (humidity > 70) {
      return { icon: '💧', text: "High humidity! A dehumidifier might help." };
    }
    return { icon: '쾌', text: "Conditions seem comfortable right now." };
  }, [sensorData, loadingData]);


  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">EcoSense Dashboard</h1>

       {error && (
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

        {sensorStatus && sensorStatus.status !== 'OK' && (
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Sensor Status Alert</AlertTitle>
           <AlertDescription>Sensor status: {sensorStatus.status}. IP: {sensorStatus.ip || 'N/A'}</AlertDescription>
         </Alert>
       )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Thermometer className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.temperature.toFixed(1)}°C</div>
            )}
            <p className="text-xs text-muted-foreground">
              {sensorStatus ? `Sensor IP: ${sensorStatus.ip}` : 'Fetching status...'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplets className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.humidity.toFixed(1)}%</div>
            )}
             <p className="text-xs text-muted-foreground">
              {sensorStatus ? `Status: ${sensorStatus.status}` : '...'}
            </p>
          </CardContent>
        </Card>
         <Card className="md:col-span-2 lg:col-span-1 bg-secondary border-none shadow-inner">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-medium text-secondary-foreground">Quick Suggestion</CardTitle>
           </CardHeader>
           <CardContent>
             {loadingData ? (
               <Skeleton className="h-6 w-full" />
             ) : getGeneralSuggestion ? (
               <div className="flex items-center gap-2">
                 <span className="text-xl">{getGeneralSuggestion.icon}</span>
                 <p className="text-sm text-secondary-foreground">{getGeneralSuggestion.text}</p>
               </div>
             ) : (
               <p className="text-sm text-muted-foreground">No suggestion available.</p>
             )}
           </CardContent>
         </Card>
      </div>

      <Card className="mb-6">
         <CardHeader>
            <CardTitle>Sensor Analytics</CardTitle>
            <CardDescription>Historical Temperature and Humidity Data</CardDescription>
         </CardHeader>
         <CardContent>
           {loadingData && historicalData.length === 0 ? (
             <Skeleton className="h-[300px] w-full" />
           ) : historicalData.length > 1 ? (
             <SensorChart data={historicalData} />
           ) : (
             <p className="text-muted-foreground text-center py-10">Insufficient data for chart. Waiting for more readings...</p>
           )}
         </CardContent>
       </Card>


      <Card>
        <CardHeader>
          <CardTitle>AI Powered Suggestions</CardTitle>
          <CardDescription>Personalized advice based on current conditions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="general"><User className="inline-block mr-1 h-4 w-4"/> General</TabsTrigger>
              <TabsTrigger value="kids"><Lightbulb className="inline-block mr-1 h-4 w-4"/> Kids</TabsTrigger>
              <TabsTrigger value="pets"><PawPrint className="inline-block mr-1 h-4 w-4"/> Pets</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              {loadingSuggestions ? (
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[90%]" />
                  </div>
              ) : (
                <p className="text-sm whitespace-pre-line">{suggestions || 'No suggestions available.'}</p>
              )}
            </TabsContent>
            <TabsContent value="kids">
              {loadingSuggestions ? (
                <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                 </div>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {kidsSuggestions.length > 0 ? kidsSuggestions.map((s, i) => <li key={`kid-${i}`}>{s}</li>) : <li>No specific suggestions for kids at this time.</li>}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="pets">
               {loadingSuggestions ? (
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                 </div>
               ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                   {petsSuggestions.length > 0 ? petsSuggestions.map((s, i) => <li key={`pet-${i}`}>{s}</li>) : <li>No specific suggestions for pets at this time.</li>}
                </ul>
               )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
