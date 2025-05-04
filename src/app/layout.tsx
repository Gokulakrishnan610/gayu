import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Toaster } from '@/components/ui/toaster';
import { MapsProvider } from '@/components/providers/maps-provider'; // Import the new client component

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'EcoSense',
  description: 'Smart Environmental Monitoring',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
         <MapsProvider apiKey={googleMapsApiKey}> {/* Use the new client component */}
           <SidebarProvider defaultOpen={true}>
             <Sidebar variant="sidebar" collapsible="icon" className="border-r">
               <MainNav />
             </Sidebar>
             <SidebarInset>{children}</SidebarInset>
             <Toaster />
           </SidebarProvider>
         </MapsProvider>
      </body>
    </html>
  );
}
