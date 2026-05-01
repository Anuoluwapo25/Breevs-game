"use client";

import { ClientProvider } from "@micro-stacks/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClientProvider
      appName="Breevs"
      appIconUrl="/favicon.ico"
      network="testnet"
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ClientProvider>
  );
}
