import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
       <Skeleton className="h-8 w-1/3" />

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
         <Skeleton className="h-28 w-full" />
         <Skeleton className="h-28 w-full" />
         <Skeleton className="h-28 w-full md:col-span-2 lg:col-span-1" />
       </div>

       <Skeleton className="h-72 w-full mb-6" />
       <Skeleton className="h-60 w-full" />

    </div>
  );
}
