"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useUser } from "@/hooks/useUser";
import type { UserRole } from "@/lib/auth/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: readonly UserRole[];
  fallback?: React.ReactNode;
}

function RoleGate({ children, allowedRoles, fallback }: ProtectedRouteProps) {
  const router = useRouter();
  const { profile, isLoading } = useUser();

  const role = profile?.role;
  const isAuthorized =
    !allowedRoles || (role !== undefined && allowedRoles.includes(role));

  useEffect(() => {
    if (isLoading) return;
    if (!profile) return;
    if (!isAuthorized) {
      router.replace("/motors");
    }
  }, [isLoading, profile, isAuthorized, router]);

  if (isLoading || (!isAuthorized && allowedRoles)) {
    return fallback ?? null;
  }

  return <>{children}</>;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
}: ProtectedRouteProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RoleGate allowedRoles={allowedRoles} fallback={fallback}>
        {children}
      </RoleGate>
    </QueryClientProvider>
  );
}
