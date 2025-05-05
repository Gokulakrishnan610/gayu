
'use client';

import type { NextPage } from 'next';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, Lightbulb, AlertTriangle, User, PawPrint, WifiOff, ServerCog, RefreshCw } from 'lucide-react';
import { SensorData, getSensorData as getMockSensorData, SensorStatus, getSensorStatus as getMockSensorStatus } from '@/services/sensor';
import { generatePersonalizedSuggestions } from '@/ai/flows/generate-personalized-suggestions';
import { generateKidsAndPetsSuggestions } from '@/ai/flows/generate-kids-and-pets-suggestions';
import SensorChart from '@/components/sensor-chart';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const initialSensorData: SensorData = { temperature: null, humidity: null };
const initialSensorStatus: SensorStatus = { status: 'Initializing', ip: 'N/A' };

// Increased suggestion fetch interval to 60 minutes (60 * 60 * 1000)
const SUGGESTION_FETCH_INTERVAL = 60 * 60 * 1000;
const SENSOR_DATA_FETCH_INTERVAL = 30 * 1000; // Fetch sensor data every 30 seconds
// Increased rate limit delay to 20 minutes
const SUGGESTION_RATE_LIMIT_DELAY = 20 * 60 * 1000;

const Home: NextPage = () => {
  const { toast } = useToast();
  const [sensorData, setSensorData] = useState<SensorData>(initialSensorData);
  const [sensorStatus, setSensorStatus] = useState<SensorStatus | null>(initialSensorStatus);
  const [suggestions, setSuggestions] = useState<string>('');
  const [kidsSuggestions, setKidsSuggestions] = useState<string[]>([]);
  const [petsSuggestions, setPetsSuggestions] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [sensorConnectionError, setSensorConnectionError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [sensorIp, setSensorIp] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [lastSuggestionFetchTime, setLastSuggestionFetchTime] = useState<number>(0);
  const [nextSuggestionFetchTime, setNextSuggestionFetchTime] = useState<number>(0);
  const [showSplash, setShowSplash] = useState(true); // State for splash screen


   // Handle Splash Screen
   useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000); // Increased duration for splash screen (3 seconds)

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []); // Run only once on mount


   useEffect(() => {
    setIsClient(true);
    const storedIp = localStorage.getItem('sensorIp');
    setSensorIp(storedIp);
  }, []);


 const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!isClient) return;

    if (isInitialLoad) setLoadingData(true);
    setSensorConnectionError(null);
    setUsingMockData(false);

    let currentIp = localStorage.getItem('sensorIp');
    setSensorIp(currentIp); // Update state for UI even if fetch fails
    console.log("Current IP:", currentIp);
    try {
        if (currentIp) {
            // console.log(`Fetching data/status from real sensor: ${currentIp}`);
            // Use http:// for local ESP32 communication
            const statusUrl = `http://${currentIp}/api/status`;
            const dataUrl = `http://${currentIp}/api/data`;

            const [statusRes, dataRes] = await Promise.all([
                fetch(statusUrl).catch(e => { throw new Error(`Status fetch failed: ${e.message}`)}),
                fetch(dataUrl).catch(e => { throw new Error(`Data fetch failed: ${e.message}`)})
            ]);

            if (!statusRes.ok || !dataRes.ok) {
                const statusError = statusRes.ok ? '' : ` Status Error ${statusRes.status}`;
                const dataError = dataRes.ok ? '' : ` Data Error ${dataRes.status}`;
                throw new Error(`Sensor response not OK.${statusError}${dataError}`);
            }

            const [statusJson, dataJson]: [SensorStatus, SensorData] = await Promise.all([
                statusRes.json().catch(() => { throw new Error('Failed to parse status JSON')}),
                dataRes.json().catch(() => { throw new Error('Failed to parse data JSON')})
            ]);

            // Basic validation for temperature and humidity types
            if (typeof dataJson.temperature !== 'number' || typeof dataJson.humidity !== 'number') {
                 console.error("Invalid data format received from sensor:", dataJson);
                 throw new Error('Invalid data format received from sensor');
            }

            const validatedData: SensorData = {
                temperature: dataJson.temperature,
                humidity: dataJson.humidity,
            };
             // console.log("Real sensor data:", validatedData, "Status:", statusJson);

            setSensorData(validatedData);
            // Ensure statusJson structure is as expected
             const validatedStatus: SensorStatus = {
                 status: typeof statusJson.status === 'string' ? statusJson.status : 'Unknown',
                 ip: typeof statusJson.ip === 'string' ? statusJson.ip : currentIp, // Fallback to currentIp
             };
            setSensorStatus(validatedStatus);

            if (validatedData.temperature !== null && validatedData.humidity !== null) {
                setHistoricalData((prev) => [...prev.slice(-29), validatedData]);
            }
             setSensorConnectionError(null); // Clear connection errors on success
             setUsingMockData(false); // Ensure mock data flag is false
        } else {
            // No IP configured, use mock data
            throw new Error("No sensor IP configured."); // Trigger mock data logic in catch block
        }
    } catch (err: any) {
        // Handle fetch errors, JSON parsing errors, data validation errors, and "No IP configured" error
        const isNoIpError = err.message === "No sensor IP configured.";
        const errorBaseMsg = isNoIpError
          ? "No sensor IP configured."
          // More specific message if it looks like a network or CORS issue
          : `Sensor at ${currentIp || 'unknown IP'} unreachable or CORS issue: ${err.message}.`;

        const errorMsg = `${errorBaseMsg} Using simulated data.`;

        console.warn("Sensor fetch error:", errorMsg, err);
        setSensorConnectionError(errorMsg);

        try {
             // console.log("Fetching mock data due to error or missing IP.");
             const [mockData, mockStatus] = await Promise.all([getMockSensorData(), getMockSensorStatus()]);
             // console.log("Mock data:", mockData, "Mock status:", mockStatus);
             setSensorData(mockData);
             setSensorStatus({...mockStatus, ip: 'N/A (Mock)'});
             if (mockData.temperature !== null && mockData.humidity !== null) {
                 setHistoricalData((prev) => [...prev.slice(-29), mockData]);
             }
             setUsingMockData(true);
        } catch (mockErr) {
             console.error('Error fetching mock sensor data:', mockErr);
             setSensorConnectionError('Failed to fetch sensor data (real and mock).');
             setSensorData(initialSensorData);
             setSensorStatus({ status: 'Error', ip: 'N/A'});
             setUsingMockData(false); // Not even using mock
        }

    } finally {
        if (isInitialLoad) setLoadingData(false);
    }
  }, [isClient]); // Added isClient dependency


 const fetchSuggestions = useCallback(async (force = false) => {
    if (!isClient) return;

    const now = Date.now();
    // Check if allowed to fetch yet (based on interval or rate limit delay)
    if (!force && now < nextSuggestionFetchTime) {
         // console.log(`Skipping suggestion fetch: Next fetch allowed at ${new Date(nextSuggestionFetchTime).toLocaleTimeString()}`);
         return;
    }

    // **Crucial check:** Only proceed if temperature and humidity are valid numbers.
    if (sensorData.temperature === null || sensorData.humidity === null) {
        console.warn('Skipping AI suggestions fetch: Sensor data contains null values.');
        setSuggestions('Suggestions unavailable due to sensor reading error.');
        setKidsSuggestions(['Suggestions unavailable.']);
        setPetsSuggestions(['Suggestions unavailable.']);
        setSuggestionError('Sensor data missing.'); // Set specific suggestion error
        setLoadingSuggestions(false);
        // Don't update nextSuggestionFetchTime here, allow retry when data is valid
        return;
    }

    setLoadingSuggestions(true);
    setSuggestionError(null); // Clear previous suggestion errors

    try {
        // Use the valid sensor data directly
        const inputData = { temperature: sensorData.temperature, humidity: sensorData.humidity };

        // console.log("Fetching AI suggestions...");
        const [personalizedResult, kidsResult, petsResult] = await Promise.all([
            generatePersonalizedSuggestions(inputData),
            generateKidsAndPetsSuggestions({ ...inputData, mode: 'kids' }),
            generateKidsAndPetsSuggestions({ ...inputData, mode: 'pets' })
        ]);

        setSuggestions(personalizedResult.suggestions);
        setKidsSuggestions(kidsResult.suggestions);
        setPetsSuggestions(petsResult.suggestions);
        setLastSuggestionFetchTime(now); // Update last successful fetch time
        setNextSuggestionFetchTime(now + SUGGESTION_FETCH_INTERVAL); // Schedule next regular fetch
        // console.log("AI suggestions fetched successfully.");
         if (force) {
             toast({ title: "Suggestions Refreshed", description: "AI suggestions updated based on current data." });
         }

    } catch (err: any) {
        console.error('Error fetching AI suggestions:', err);
        // Determine if it's a rate limit error (often 429 status or message)
        const isRateLimitError = err.message?.includes('429') || err.message?.includes('Too Many Requests') || err.message?.includes('quota');
        const suggestionErrMsg = isRateLimitError
           ? 'AI suggestions temporarily unavailable due to rate limits. Please try again later.'
           : `Could not load AI suggestions: ${err.message || 'Unknown error'}`; // Include error message

        setSuggestions(suggestionErrMsg); // Show error in the general suggestions area
        setKidsSuggestions([suggestionErrMsg]);
        setPetsSuggestions([suggestionErrMsg]);
        setSuggestionError(suggestionErrMsg); // Set specific error state
        // Don't necessarily update lastSuggestionFetchTime on failure? Or maybe do to prevent rapid loops? Let's update it.
        setLastSuggestionFetchTime(now);

        // If rate limited, set a longer delay before the next attempt
        if (isRateLimitError) {
            setNextSuggestionFetchTime(now + SUGGESTION_RATE_LIMIT_DELAY);
             console.warn(`Rate limit hit. Next suggestion fetch delayed until ${new Date(now + SUGGESTION_RATE_LIMIT_DELAY).toLocaleTimeString()}`);
        } else {
             // For other errors, use the standard interval
             setNextSuggestionFetchTime(now + SUGGESTION_FETCH_INTERVAL);
        }

         if (force) {
             toast({ variant: "destructive", title: "Suggestion Error", description: suggestionErrMsg });
         }
    } finally {
        setLoadingSuggestions(false);
    }
}, [isClient, sensorData, nextSuggestionFetchTime, toast]); // Dependencies updated


   // Initial data fetch
   useEffect(() => {
    if (isClient) {
        fetchData(true); // Pass true for initial load
    }
  }, [isClient, fetchData]); // Depend on isClient and fetchData

   // Interval for sensor data fetching
   useEffect(() => {
    if (isClient) {
        const dataIntervalId = setInterval(() => fetchData(false), SENSOR_DATA_FETCH_INTERVAL);
        return () => clearInterval(dataIntervalId);
    }
  }, [isClient, fetchData]);

  // Trigger for suggestion fetching (only when sensorData is valid and ready)
  useEffect(() => {
    if (isClient && sensorData.temperature !== null && sensorData.humidity !== null) {
        // Fetch immediately if conditions met and never fetched before or interval passed
        const now = Date.now();
        if (now >= nextSuggestionFetchTime) {
             fetchSuggestions(lastSuggestionFetchTime === 0); // Force fetch only the very first time
        }

        // Set up interval based on the next allowed fetch time
        const timeUntilNextFetch = Math.max(0, nextSuggestionFetchTime - now);
        let suggestionIntervalId: NodeJS.Timeout | null = null; // Declare interval ID variable

         const suggestionTimeoutId = setTimeout(() => {
             fetchSuggestions(false); // Fetch non-forced
             // Set interval for subsequent fetches after this one
             suggestionIntervalId = setInterval(() => fetchSuggestions(false), SUGGESTION_FETCH_INTERVAL);
         }, timeUntilNextFetch);


        // Clear timeout and interval on unmount or dependency change
        return () => {
            clearTimeout(suggestionTimeoutId);
            if (suggestionIntervalId) {
                clearInterval(suggestionIntervalId);
            }
        };
    }
  }, [isClient, sensorData, fetchSuggestions, nextSuggestionFetchTime, lastSuggestionFetchTime]); // Dependencies updated


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
    return { icon: '😊', text: "Conditions seem comfortable right now." };
  }, [sensorData, loadingData]);

  // Render splash screen until client-side hydration and splash timeout
  if (!isClient || showSplash) {
      return <SplashScreen />;
  }


  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">EcoSense Dashboard</h1>

       {/* Sensor Connection Error Alert */}
       {sensorConnectionError && !usingMockData && ( // Only show if there's a connection error AND we aren't successfully using mock data
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Sensor Connection Error</AlertTitle>
           <AlertDescription>{sensorConnectionError}</AlertDescription>
         </Alert>
       )}

       {/* Sensor Status Alert (e.g., reporting non-OK status) */}
        {sensorStatus && sensorStatus.status !== 'OK' && !loadingData && !sensorConnectionError && ( // Show only if status is not OK, not loading, and no connection error
         <Alert variant="destructive" className="mb-6">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Sensor Status Alert</AlertTitle>
           <AlertDescription>Sensor reported status: {sensorStatus.status}. IP: {sensorStatus.ip || 'N/A'}</AlertDescription>
         </Alert>
       )}

        {/* Using Mock Data Info Alert */}
       {usingMockData && !sensorConnectionError && !loadingData && ( // Show mock data info only if successfully using mock data, no connection error, and not loading
            <Alert variant="default" className="mb-6 border-blue-500 text-blue-800 dark:border-blue-400 dark:text-blue-300">
               <ServerCog className="h-4 w-4 text-blue-600 dark:text-blue-400" />
               <AlertTitle>Using Mock Data</AlertTitle>
               <AlertDescription>
                 {sensorConnectionError || "No sensor IP configured."} Displaying simulated data.
                 Go to <a href="/settings" className="underline font-medium">Settings</a> to configure your sensor IP.
               </AlertDescription>
            </Alert>
        )}

       {/* AI Suggestion Error Alert */}
        {suggestionError && !loadingSuggestions && (
            <Alert variant="destructive" className="mb-6">
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>AI Suggestion Error</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                    <span>{suggestionError}</span>
                     {/* Allow retrying suggestions manually */}
                     <Button variant="outline" size="sm" onClick={() => fetchSuggestions(true)} disabled={loadingSuggestions}>
                         <RefreshCw className={cn('mr-1 h-4 w-4', loadingSuggestions && 'animate-spin')} /> Retry
                     </Button>
                </AlertDescription>
            </Alert>
        )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
             {loadingData ? <Skeleton className="h-5 w-5 rounded-full" /> : <Thermometer className="h-5 w-5 text-accent" />}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.temperature?.toFixed(1) ?? '--'}°C</div>
            )}
            <p className="text-xs text-muted-foreground truncate">
              {loadingData ? 'Fetching status...' : sensorStatus ? `Sensor IP: ${sensorStatus.ip || 'N/A'}` : 'Status unavailable'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            {loadingData ? <Skeleton className="h-5 w-5 rounded-full" /> : <Droplets className="h-5 w-5 text-primary" />}
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{sensorData.humidity?.toFixed(1) ?? '--'}%</div>
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
             ) : sensorConnectionError || sensorData.temperature === null || sensorData.humidity === null ? (
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
           {loadingData && historicalData.length < 2 ? (
             <Skeleton className="h-[300px] w-full" />
           ) : historicalData.length > 1 ? (
             <SensorChart data={historicalData} />
           ) : (
             <p className="text-muted-foreground text-center py-10">
               {sensorConnectionError ? 'Could not load data for chart.' : 'Insufficient data for chart. Waiting for more readings...'}
             </p>
           )}
         </CardContent>
       </Card>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>AI Powered Suggestions</CardTitle>
              <CardDescription>Personalized advice based on current conditions.</CardDescription>
            </div>
            {/* Manual Refresh Button for Suggestions */}
            <Button variant="ghost" size="sm" onClick={() => fetchSuggestions(true)} disabled={loadingSuggestions || Date.now() < nextSuggestionFetchTime}>
                 <RefreshCw className={cn('mr-1 h-4 w-4', loadingSuggestions && 'animate-spin')} />
                 Refresh Now
            </Button>
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
                <p className="text-sm whitespace-pre-line pt-2">{suggestions || 'No suggestions available.'}</p>
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
                  {kidsSuggestions.length > 0 && !suggestionError
                     ? kidsSuggestions.map((s, i) => <li key={`kid-${i}`}>{s}</li>)
                     : <li>{suggestionError || 'No specific suggestions for kids available.'}</li>
                  }
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
                   {petsSuggestions.length > 0 && !suggestionError
                      ? petsSuggestions.map((s, i) => <li key={`pet-${i}`}>{s}</li>)
                      : <li>{suggestionError || 'No specific suggestions for pets available.'}</li>
                   }
                </ul>
               )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Simple Splash Screen Component (reusing Loading component structure)
const SplashScreen = () => (
     <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background space-y-6 animate-in fade-in duration-2000"> {/* Increased duration */}
       {/* Logo with a subtle pulse */}
       <Thermometer className="w-20 h-20 text-primary animate-pulse motion-reduce:animate-none" />
       {/* App Name */}
       <div className="text-3xl font-bold text-primary tracking-wider">EcoSense</div>
       {/* Loading Indicator Dots */}
       <div className="flex space-x-2 pt-4">
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-0" />
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-150" />
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-300" />
       </div>
    </div>
);


export default Home;



