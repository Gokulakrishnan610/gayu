
'use client';

import type { NextPage } from 'next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, Lightbulb, AlertTriangle, User, PawPrint, WifiOff, ServerCog } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData, SensorStatus, getSensorStatus as getMockSensorStatus } from '@/services/sensor';
import { generatePersonalizedSuggestions } from '@/ai/flows/generate-personalized-suggestions';
import { generateKidsAndPetsSuggestions } from '@/ai/flows/generate-kids-and-pets-suggestions';
import SensorChart from '@/components/sensor-chart';

const initialSensorData: SensorData = { temperature: null, humidity: null }; // Initialize with null
const initialSensorStatus: SensorStatus = { status: 'Initializing', ip: 'N/A' };

const Home: NextPage = () => {
  const [sensorData, setSensorData] = useState<SensorData>(initialSensorData);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus | null>(initialSensorStatus);
  const [suggestions, setSuggestions] = useState<string>('');
  const [kidsSuggestions, setKidsSuggestions] = useState<string[]>([]);
  const [petsSuggestions, setPetsSuggestions] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);

   useEffect(() => {
    setIsClient(true);
    const storedIp = localStorage.getItem('sensorIp');
    setSensorIp(storedIp);
  }, []);


 const fetchData = useCallback(async () => {
    if (!isClient) return; // Don't run on server

    setLoadingData(true);
    setError(null);
    setUsingMockData(false);

    let currentIp = localStorage.getItem('sensorIp'); // Get latest IP
    setSensorIp(currentIp);

    if (currentIp) {
      // Attempt to fetch from the real sensor IP
      try {
        const [statusRes, dataRes] = await Promise.all([
          fetch(`http://${currentIp}/status`).catch(e => { throw new Error(`Status fetch failed: ${e.message}`)}),
          fetch(`http://${currentIp}/data`).catch(e => { throw new Error(`Data fetch failed: ${e.message}`)})
        ]);

        if (!statusRes.ok || !dataRes.ok) {
           throw new Error(`Sensor response not OK (Status: ${statusRes.status}, Data: ${dataRes.status})`);
        }

        const [statusJson, dataJson]: [SensorStatus, SensorData] = await Promise.all([
           statusRes.json().catch(() => { throw new Error('Failed to parse status JSON')}),
           dataRes.json().catch(() => { throw new Error('Failed to parse data JSON')})
        ]);

        // Basic validation - ensure values are numbers or null
        const validatedData: SensorData = {
            temperature: typeof dataJson.temperature === 'number' ? dataJson.temperature : null,
            humidity: typeof dataJson.humidity === 'number' ? dataJson.humidity : null,
        };


        setSensorData(validatedData);
        setSensorStatus(statusJson);
        // Add to history only if data is valid (not null)
        if (validatedData.temperature !== null && validatedData.humidity !== null) {
            setHistoricalData((prev) => [...prev.slice(-29), validatedData]); // Keep last 30 readings
        }
        setError(null); // Clear previous errors on success


      } catch (err: any) {
        console.error('Error fetching real sensor data:', err);
        setError(`Failed to connect to sensor at ${currentIp}: ${err.message}. Falling back to mock data.`);
        // Fallback to mock data on error
        const [mockData, mockStatus] = await Promise.all([getMockSensorData(), getMockSensorStatus()]);
        setSensorData(mockData);
        setSensorStatus({...mockStatus, ip: 'N/A (Mock)'}); // Indicate mock data
        if (mockData.temperature !== null && mockData.humidity !== null) {
            setHistoricalData((prev) => [...prev.slice(-29), mockData]);
        }
        setUsingMockData(true);
      } finally {
        setLoadingData(false);
      }
    } else {
      // Use mock data if no IP is set
      try {
        const [mockData, mockStatus] = await Promise.all([getMockSensorData(), getMockSensorStatus()]);
        setSensorData(mockData);
        setSensorStatus({...mockStatus, ip: 'N/A (Mock)'}); // Indicate mock data
        if (mockData.temperature !== null && mockData.humidity !== null) {
             setHistoricalData((prev) => [...prev.slice(-29), mockData]);
        }
        setUsingMockData(true);
        setError(null); // Clear error if previously set
      } catch (mockErr) {
          console.error('Error fetching mock sensor data:', mockErr);
          setError('Failed to fetch mock sensor data.');
          setSensorData(initialSensorData); // Reset to initial null state
          setSensorStatus({ status: 'Error', ip: 'N/A'});
      } finally {
          setLoadingData(false);
      }
    }
  }, [isClient]); // Added isClient dependency


 const fetchSuggestions = useCallback(async (data: SensorData) => {
    if (!isClient) return; // Don't run on server

    // **Crucial check:** Only proceed if temperature and humidity are valid numbers.
    if (data.temperature === null || data.humidity === null) {
        console.warn('Skipping AI suggestions fetch: Sensor data contains null values.');
        setSuggestions('Suggestions unavailable due to sensor reading error.');
        setKidsSuggestions(['Suggestions unavailable.']);
        setPetsSuggestions(['Suggestions unavailable.']);
        setLoadingSuggestions(false); // Ensure loading state is turned off
        return;
    }

    setLoadingSuggestions(true);
    try {
        // Use the valid sensor data directly
        const inputData = { temperature: data.temperature, humidity: data.humidity };

        const [personalizedResult, kidsResult, petsResult] = await Promise.all([
            generatePersonalizedSuggestions(inputData),
            generateKidsAndPetsSuggestions({ ...inputData, mode: 'kids' }),
            generateKidsAndPetsSuggestions({ ...inputData, mode: 'pets' })
        ]);

        setSuggestions(personalizedResult.suggestions);
        setKidsSuggestions(kidsResult.suggestions);
        setPetsSuggestions(petsResult.suggestions);
    } catch (err) {
        console.error('Error fetching AI suggestions:', err);
        setSuggestions('Could not load suggestions at this time.');
        setKidsSuggestions(['Could not load suggestions.']);
        setPetsSuggestions(['Could not load suggestions.']);
        // Optionally set a different error state for suggestions
    } finally {
        setLoadingSuggestions(false);
    }
}, [isClient]);


   // Initial fetch and setup interval
   useEffect(() => {
    if (isClient) {
        fetchData(); // Initial fetch
        const intervalId = setInterval(fetchData, 30000); // Fetch every 30 seconds
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }
  }, [isClient, fetchData]); // Depend on isClient and fetchData


  // Fetch suggestions when sensor data (valid data) changes
  useEffect(() => {
    // Only fetch if data is valid (not null)
    if (isClient && sensorData.temperature !== null && sensorData.humidity !== null) {
        fetchSuggestions(sensorData);
    } else if (isClient) {
        // Explicitly handle the case where data becomes null after being valid
         setSuggestions('Suggestions unavailable due to sensor reading error.');
         setKidsSuggestions(['Suggestions unavailable.']);
         setPetsSuggestions(['Suggestions unavailable.']);
         setLoadingSuggestions(false);
    }
  }, [sensorData, fetchSuggestions, isClient]); // Depend on sensorData, fetchSuggestions, and isClient


  const getGeneralSuggestion = useMemo(() => {
    if (loadingData || sensorData.temperature === null || sensorData.humidity === null) return null;

    const { temperature, humidity } = sensorData;

    if (temperature > 30 && humidity > 60) {
      return { icon: '🥵💧', text: "Hot and humid! Stay cool and hydrated. Consider A/C or dehumidifier." };
    } else if (temperature > 30) {
      return { icon: '🥵', text: "It's hot! Stay hydrated and find shade or use a fan." };
    } else if (temperature < 15 && humidity < 40) {
       return { icon: '🥶🌵', text: "Cold and dry. Bundle up and consider a humidifier." };
    } else if (temperature < 15) {
      return { icon: '🥶', text: "Feeling chilly? Grab a blanket or a warm drink." };
    } else if (humidity < 40) {
      return { icon: '🌵', text: "Air is dry. Consider using a humidifier or moisturizing." };
    } else if (humidity > 70) {
      return { icon: '💧', text: "High humidity! A dehumidifier might help prevent stuffiness." };
    }
    return { icon: '😊', text: "Conditions seem comfortable right now." }; // Changed icon
  }, [sensorData, loadingData]);

  // Render skeleton or minimal UI until client-side hydration
  if (!isClient) {
      return (
        <div className="container mx-auto p-4 md:p-8 space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full md:col-span-2 lg:col-span-1" />
          </div>
          <Skeleton className="h-72 w-full mb-6" />
          <Skeleton className="h-60 w-full" />
        </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">EcoSense Dashboard</h1>

       {error && (
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Connection Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       )}

        {sensorStatus && sensorStatus.status !== 'OK' && !loadingData && !error && ( // Show only if not loading and no connection error
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Sensor Status Alert</AlertTitle>
           <AlertDescription>Sensor reported status: {sensorStatus.status}. IP: {sensorStatus.ip || 'N/A'}</AlertDescription>
         </Alert>
       )}

       {usingMockData && !error && !loadingData && ( // Show mock data info only if loaded and no connection error
            <Alert variant="default" className="mb-6 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
               <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
               <AlertTitle>Using Mock Data</AlertTitle>
               <AlertDescription>
                 No sensor IP configured or connection failed. Displaying simulated data.
                 Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your sensor IP.
               </AlertDescription>
            </Alert>
        )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
             {loadingData ? <Skeleton className="h-5 w-5" /> : <Thermometer className="h-5 w-5 text-accent" />}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.temperature?.toFixed(1) ?? 'N/A'}°C</div>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {loadingData ? 'Fetching status...' : sensorStatus ? `Sensor IP: ${sensorStatus.ip || 'N/A'}` : 'Status unavailable'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            {loadingData ? <Skeleton className="h-5 w-5" /> : <Droplets className="h-5 w-5 text-primary" />}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.humidity?.toFixed(1) ?? 'N/A'}%</div>
            )}
             <p className="text-xs text-muted-foreground">
              {loadingData ? '...' : sensorStatus ? `Status: ${sensorStatus.status || 'N/A'}` : '...'}
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
             ) : error || sensorData.temperature === null || sensorData.humidity === null ? (
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <WifiOff className="h-4 w-4"/> Awaiting valid sensor data...
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
            <CardDescription>Historical Temperature and Humidity Data (Last 30 Readings)</CardDescription>
         </CardHeader>
         <CardContent>
           {loadingData && historicalData.length < 2 ? ( // Show skeleton if loading and not enough data
             <Skeleton className="h-[300px] w-full" />
           ) : historicalData.length > 1 ? (
             <SensorChart data={historicalData} />
           ) : ( // Show message if not loading but still not enough data
             <p className="text-muted-foreground text-center py-10">
               {error ? 'Could not load data for chart.' : 'Insufficient data for chart. Waiting for more readings...'}
             </p>
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
                 <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                    <Skeleton className="h-4 w-[90%]" />
                  </div>
              ) : (
                <p className="text-sm whitespace-pre-line pt-2">{suggestions || 'No suggestions available at this time.'}</p>
              )}
            </TabsContent>
            <TabsContent value="kids">
              {loadingSuggestions ? (
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                 </div>
              ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm pt-2">
                  {kidsSuggestions.length > 0 ? kidsSuggestions.map((s, i) => <li key={`kid-${i}`}>{s}</li>) : <li>No specific suggestions for kids available.</li>}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="pets">
               {loadingSuggestions ? (
                 <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                 </div>
               ) : (
                <ul className="list-disc pl-5 space-y-1 text-sm pt-2">
                   {petsSuggestions.length > 0 ? petsSuggestions.map((s, i) => <li key={`pet-${i}`}>{s}</li>) : <li>No specific suggestions for pets available.</li>}
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

    