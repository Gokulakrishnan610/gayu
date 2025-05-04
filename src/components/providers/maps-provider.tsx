
'use client';

import React from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AlertTriangle } from 'lucide-react';
import MapsContext from '@/contexts/maps-context'; // Import the new context

interface MapsProviderProps {
  apiKey: string | undefined;
  children: React.ReactNode;
}

export function MapsProvider({ apiKey, children }: MapsProviderProps) {
  const isMapsApiAvailable = !!apiKey;

  if (!isMapsApiAvailable) {
    console.warn("Google Maps API Key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
    // Provide context even if key is missing, but don't render APIProvider
    return (
      <MapsContext.Provider value={{ isMapsApiAvailable }}>
        <div className="flex flex-col min-h-screen">
           <div className="container mx-auto p-4 text-center text-destructive bg-destructive/10 border border-destructive/50 rounded-md my-4 flex items-center gap-2 justify-center">
              <AlertTriangle className="h-5 w-5" />
              <p>Google Maps API Key is missing. Map functionality will be disabled.</p>
            </div>
            {children} {/* Render children without APIProvider */}
        </div>
      </MapsContext.Provider>
    );
  }

  // If API key exists, wrap with both providers
  return (
    <MapsContext.Provider value={{ isMapsApiAvailable }}>
      <APIProvider apiKey={apiKey}>
        {children}
      </APIProvider>
    </MapsContext.Provider>
  );
}
