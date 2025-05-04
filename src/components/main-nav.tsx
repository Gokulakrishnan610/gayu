// 'use client';

// import * as React from 'react';
// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import { Home, Map, Settings, Thermometer } from 'lucide-react'; // Added Settings icon

// import { cn } from '@/lib/utils';
// import {
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuItem,
//   SidebarMenuButton,
//   SidebarTrigger,
//   SidebarContent,
// } from '@/components/ui/sidebar';
// import { Button } from './ui/button'; // Assuming Button is in ui

// export function MainNav() {
//   const pathname = usePathname();

//   return (
//     <>
//       <SidebarHeader className="flex items-center justify-between p-2">
//         <div className="flex items-center gap-2">
//            <Thermometer className="w-6 h-6 text-primary" />
//            <h2 className="text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">
//               EcoSense
//            </h2>
//         </div>

//         <SidebarTrigger className="hidden md:flex" />
//       </SidebarHeader>

//       <SidebarContent>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <Link href="/" passHref legacyBehavior>
//               <SidebarMenuButton
//                 asChild
//                 isActive={pathname === '/'}
//                 tooltip={{ children: 'Dashboard' }}
//               >
//                 <a>
//                   <Home />
//                   <span>Dashboard</span>
//                 </a>
//               </SidebarMenuButton>
//             </Link>
//           </SidebarMenuItem>
//           <SidebarMenuItem>
//             <Link href="/map" passHref legacyBehavior>
//               <SidebarMenuButton
//                 asChild
//                 isActive={pathname === '/map'}
//                 tooltip={{ children: 'Temperature Map' }}
//               >
//                 <a>
//                   <Map />
//                   <span>Temperature Map</span>
//                 </a>
//               </SidebarMenuButton>
//             </Link>
//           </SidebarMenuItem>
//            <SidebarMenuItem>
//             <Link href="/settings" passHref legacyBehavior>
//               <SidebarMenuButton
//                 asChild
//                 isActive={pathname === '/settings'}
//                 tooltip={{ children: 'Settings' }}
//               >
//                 <a>
//                   <Settings />
//                   <span>Settings</span>
//                 </a>
//               </SidebarMenuButton>
//             </Link>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarContent>
//     </>
//   );
// }



'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Settings, Thermometer, PanelLeft } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContent,
  useSidebar,
  SidebarFooter, // Import SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from './ui/button';

export function MainNav() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar, isMobile, open } = useSidebar(); // Get sidebar state and toggle function

  const navItems = [
      { href: '/', label: 'Dashboard', icon: Home, active: pathname === '/' },
      { href: '/map', label: 'Sensor Map', icon: Map, active: pathname === '/map' },
      // Move Settings to the bottom
      // { href: '/settings', label: 'Settings', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <>
      {/* Header: Logo, Title, and Toggles */}
      <SidebarHeader className="flex items-center justify-between p-2 md:p-3 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 flex-grow overflow-hidden" aria-label="Go to Dashboard">
             <Thermometer className="w-6 h-6 md:w-7 md:h-7 text-primary shrink-0" />
             {/* Hide title when collapsed on desktop */}
             <h2 className={cn(
                 "text-lg md:text-xl font-semibold text-primary truncate",
                 sidebarState === 'collapsed' && !isMobile && "md:hidden" // Hide on desktop collapsed
             )}>
                EcoSense
             </h2>
        </Link>

         {/* Desktop Trigger - Conditionally render based on variant/collapsible */}
         <SidebarTrigger className={cn(
             "hidden md:flex shrink-0 ml-2",
             sidebarState === 'collapsed' && 'rotate-180' // Optional: Rotate arrow when collapsed
         )} />

          {/* Mobile Burger Button (appears inside header on mobile) */}
         <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0" // Show only on mobile
            onClick={toggleSidebar}
            aria-label="Toggle Navigation Menu"
          >
            <PanelLeft className="w-6 h-6" />
          </Button>
      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="flex-1 px-2 md:px-3 py-2 overflow-y-auto"> {/* Allow scrolling if needed */}
        <SidebarMenu>
           {navItems.map((item) => (
               <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={item.active}
                    // Apply tooltip only when collapsed on desktop
                    tooltip={sidebarState === 'collapsed' && !isMobile ? { children: item.label, side: 'right' } : undefined}
                  >
                    <item.icon className="shrink-0 w-5 h-5" /> {/* Consistent icon size */}
                    {/* Span for text, hidden when collapsed */}
                    <span className={cn("truncate", sidebarState === 'collapsed' && !isMobile && 'md:hidden')}>
                      {item.label}
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
           ))}
        </SidebarMenu>
      </SidebarContent>

       {/* Footer Navigation (Settings) */}
      <SidebarFooter className="p-2 md:p-3 border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/settings" passHref>
                  <SidebarMenuButton
                    isActive={pathname === '/settings'}
                    tooltip={sidebarState === 'collapsed' && !isMobile ? { children: 'Settings', side: 'right' } : undefined}
                  >
                    <Settings className="shrink-0 w-5 h-5" />
                    <span className={cn("truncate", sidebarState === 'collapsed' && !isMobile && 'md:hidden')}>
                      Settings
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
