"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppContextProvider } from "@/hooks/useAppContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AppContextProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AppContextProvider>
    </QueryClientProvider>
  );
}
