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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from './ui/button'; // Keep Button import if SidebarTrigger uses it implicitly

export function MainNav() {
  const pathname = usePathname();
  const { state: sidebarState, isMobile } = useSidebar(); // Get sidebar state, removed toggleSidebar as trigger is moved

  const navItems = [
      { href: '/', label: 'Dashboard', icon: Home, active: pathname === '/' },
      { href: '/map', label: 'Sensor Map', icon: Map, active: pathname === '/map' },
  ];

  return (
    <>
      {/* Header: Logo, Title, and Desktop Toggle */}
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
         {/* Ensure SidebarTrigger is correctly implemented or replace with Button if needed */}
         <SidebarTrigger className={cn(
             "hidden md:flex shrink-0 ml-2"
             // Optional rotation is handled internally by SidebarTrigger or needs manual state check
         )} />

         {/* Mobile Burger Button removed from here */}

      </SidebarHeader>

      {/* Main Navigation Content */}
      <SidebarContent className="flex-1 px-2 md:px-3 py-2 overflow-y-auto">
        <SidebarMenu>
           {navItems.map((item) => (
               <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild // Use asChild to pass props to the underlying <a> tag from Link
                    isActive={item.active}
                    tooltip={sidebarState === 'collapsed' && !isMobile ? { children: item.label, side: 'right' } : undefined}
                  >
                    <a> {/* The actual element receiving button styles and props */}
                      <item.icon className="shrink-0 w-5 h-5" />
                      <span className={cn("truncate", sidebarState === 'collapsed' && !isMobile && 'md:hidden')}>
                        {item.label}
                      </span>
                    </a>
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
                <Link href="/settings" passHref legacyBehavior>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/settings'}
                    tooltip={sidebarState === 'collapsed' && !isMobile ? { children: 'Settings', side: 'right' } : undefined}
                  >
                    <a>
                      <Settings className="shrink-0 w-5 h-5" />
                      <span className={cn("truncate", sidebarState === 'collapsed' && !isMobile && 'md:hidden')}>
                        Settings
                      </span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
