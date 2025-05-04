'use client';

import React from 'react';
import { PanelLeft, Thermometer } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function MobileHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
       {/* Mobile Sidebar Toggle */}
      <Button
        variant="outline"
        size="icon"
        className="shrink-0" // Always visible on mobile, hidden on md+ by parent's md:hidden
        onClick={toggleSidebar}
        aria-label="Toggle Navigation Menu"
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

       {/* Optional: Mobile Logo/Title */}
        <Link href="/" className="flex items-center gap-2 flex-grow overflow-hidden" aria-label="Go to Dashboard">
             <Thermometer className="w-6 h-6 text-primary shrink-0" />
             <h2 className="text-lg font-semibold text-primary truncate">
                EcoSense
             </h2>
        </Link>

      {/* Add other mobile header elements here if needed, like user menu */}
    </header>
  );
}
