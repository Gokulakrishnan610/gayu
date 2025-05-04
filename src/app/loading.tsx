// import { Skeleton } from "@/components/ui/skeleton";

// export default function Loading() {
//   // You can add any UI inside Loading, including a Skeleton.
//   return (
//     <div className="container mx-auto p-4 md:p-8 space-y-6">
//        <Skeleton className="h-8 w-1/3" />

//        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
//          <Skeleton className="h-28 w-full" />
//          <Skeleton className="h-28 w-full" />
//          <Skeleton className="h-28 w-full md:col-span-2 lg:col-span-1" />
//        </div>

//        <Skeleton className="h-72 w-full mb-6" />
//        <Skeleton className="h-60 w-full" />

//     </div>
//   );
// }



// import { Skeleton } from "@/components/ui/skeleton";
// import { Thermometer } from "lucide-react";

// export default function Loading() {
//   // Centered splash screen appearance
//   return (
//     <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background space-y-4">
//        <Thermometer className="w-16 h-16 text-primary animate-pulse" />
//        <div className="text-xl font-semibold text-primary">EcoSense</div>
//        <div className="flex space-x-2">
//           <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-0" />
//           <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-150" />
//           <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-300" />
//        </div>
//        {/* Optional: Keep some skeleton layout if preferred, but centering is more splash-like */}
//        {/* <div className="container mx-auto p-4 md:p-8 space-y-6 opacity-50">
//          <Skeleton className="h-8 w-1/3 mx-auto" />
//          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
//            <Skeleton className="h-28 w-full" />
//            <Skeleton className="h-28 w-full" />
//            <Skeleton className="h-28 w-full md:col-span-1" />
//          </div>
//          <Skeleton className="h-72 w-full mb-6" />
//        </div> */}
//     </div>
//   );
// }




import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer } from "lucide-react";

export default function Loading() {
  // Centered splash screen appearance with fade-in animation
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background space-y-6 animate-in fade-in duration-2000"> {/* Increased duration */}
       {/* Logo with a subtle pulse */}
       <Thermometer className="w-20 h-20 text-primary animate-pulse motion-reduce:animate-none" />
       {/* App Name */}
       <div className="text-3xl font-bold text-primary tracking-wider">EcoSense</div>
       {/* Loading Indicator Dots */}
       <div className="flex space-x-2 pt-4">
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-0" />
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-150" />
          <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground animate-bounce delay-300" />
       </div>
    </div>
  );
}
