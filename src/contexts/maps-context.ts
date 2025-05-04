
'use client';
import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

interface MapsContextValue {
  isMapsApiAvailable: boolean;
}

const MapsContext = createContext<MapsContextValue | null>(null);

export const useMapsContext = () => {
  const context = useContext(MapsContext);
  if (!context) {
    // This should ideally not happen if the hook is used within the MapsProvider
    console.warn('useMapsContext must be used within a MapsProvider');
    return { isMapsApiAvailable: false };
  }
  return context;
};

export default MapsContext;
