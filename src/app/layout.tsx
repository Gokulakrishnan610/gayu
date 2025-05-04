import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// Removed: import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS - Not needed for react-leaflet v4+
// Removed: import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css'; // Import compatibility CSS
import { cn } from '@/lib/utils';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable
        )}
      >
         <ThemeProvider
            attribute="class"
            defaultTheme="system" // Or 'light' / 'dark' if you don't want system preference
            enableSystem
            disableTransitionOnChange
          >
             <SidebarProvider defaultOpen={true}>
               <Sidebar variant="sidebar" collapsible="icon" className="border-r">
                 <MainNav />
               </Sidebar>
               <SidebarInset>{children}</SidebarInset>
               <Toaster />
             </SidebarProvider>
         </ThemeProvider>
      </body>
    </html>
  );
}
