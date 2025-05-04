import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Component props definition
interface MapWrapperProps {
  children: React.ReactNode;
  isLeafletLoaded: boolean;
  isLoading: boolean;
}

const MapWrapper: React.FC<MapWrapperProps> = ({ 
  children, 
  isLeafletLoaded,
  isLoading 
}) => {
  const [mounted, setMounted] = useState(false);
  
  // Only mount the map component after the component is fully mounted in the DOM
  useEffect(() => {
    setMounted(true);
    
    return () => {
      // Clean up effect
      setMounted(false);
    };
  }, []);
  
  if (!mounted || !isLeafletLoaded) {
    return (
      <Skeleton className="absolute inset-0 w-full h-full rounded-b-lg bg-muted/80 flex items-center justify-center">
        <p>Loading Map...</p>
      </Skeleton>
    );
  }
  
  return (
    <>
      {children}
      
      {/* Loading overlay - Displayed when actively fetching data */}
      {isLoading && (
        <div className="absolute inset-0 w-full h-full rounded-b-lg z-10 bg-muted/80 flex items-center justify-center">
          <p>Updating Data...</p>
        </div>
      )}
    </>
  );
};

export default MapWrapper;