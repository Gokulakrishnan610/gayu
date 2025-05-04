'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map, Settings, Thermometer } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarContent,
} from '@/components/ui/sidebar';
import { Button } from './ui/button'; // Assuming Button is in ui

export function MainNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
           <Thermometer className="w-6 h-6 text-primary" />
           <h2 className="text-lg font-semibold text-primary group-data-[collapsible=icon]:hidden">
              EcoSense
           </h2>
        </div>

        <SidebarTrigger className="hidden md:flex" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/'}
                tooltip={{ children: 'Dashboard' }}
              >
                <a>
                  <Home />
                  <span>Dashboard</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/map" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/map'}
                tooltip={{ children: 'Temperature Map' }}
              >
                <a>
                  <Map />
                  <span>Temperature Map</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           {/* Add more navigation items here if needed
           <SidebarMenuItem>
            <Link href="/settings" passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/settings'}
                tooltip={{ children: 'Settings' }}
              >
                <a>
                  <Settings />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem> */}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
