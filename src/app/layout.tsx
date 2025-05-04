import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Toaster } from '@/components/ui/toaster';
import { APIProvider } from '@vis.gl/react-google-maps';

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

  if (!googleMapsApiKey) {
    console.error("Google Maps API Key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable.");
    // Optionally render an error message or fallback UI
  }


  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
        {googleMapsApiKey ? (
           <APIProvider apiKey={googleMapsApiKey}>
             <SidebarProvider defaultOpen={true}>
               <Sidebar variant="sidebar" collapsible="icon" className="border-r">
                 <MainNav />
               </Sidebar>
               <SidebarInset>{children}</SidebarInset>
               <Toaster />
             </SidebarProvider>
           </APIProvider>
         ) : (
           // Render a fallback or loading state if the API key is missing
           <div className="flex h-screen items-center justify-center">
             <p className="text-destructive">Google Maps API Key is missing. Map functionality will be disabled.</p>
              <SidebarProvider defaultOpen={true}>
               <Sidebar variant="sidebar" collapsible="icon" className="border-r">
                 <MainNav />
               </Sidebar>
               <SidebarInset>{children}</SidebarInset>
               <Toaster />
             </SidebarProvider>
           </div>
         )}

      </body>
    </html>
  );
}
