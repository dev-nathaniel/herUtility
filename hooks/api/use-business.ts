/**
 * Business & Dashboard Hooks
 *
 * Fetches businesses, sites, utilities, and dashboard data from the server.
 */

import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppMutation, useAppQuery } from "../queries";

// ============================================================================
// Types (matching server models)
// ============================================================================

export interface BusinessMember {
  userId: string;
  role: "owner" | "manager" | "viewer";
}

export interface Business {
  _id: string;
  name: string;
  address: string;
  postcode?: string;
  members: BusinessMember[];
  sites?: string[];
  utilities?: (Utility | string)[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Site {
  _id: string;
  name: string;
  business: string;
  address: string;
  members?: BusinessMember[];
  utilities?: (Utility | string)[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Utility {
  _id: string;
  site?: string;
  business?: string;
  type: "electricity" | "gas" | "water" | "telecoms";
  supplier?: string;
  identifier?: string;
  contractStart?: string;
  contractEnd?: string;
  billingFrequency?: string;
  paymentMethod?: string;
  notes?: string;
  status?: "active" | "expired" | "pending";
  previousContractExpiry?: string;
  previousMeterId?: string;
  previousSupplier?: string;
  tariffRate?: number;
  standingCharge?: number;
  annualUsage?: number;
  estimatedAnnualCost?: number;
  meterSerial?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardOverview {
  userCount: number;
  businessCount: number;
  siteCount: number;
  pendingQuotesCount: number;
  contractsCount: number;
  emailsSentCount: number;
  templatesCount: number;
}

// ============================================================================
// Query Key Factories
// ============================================================================

export const businessKeys = {
  all: ["businesses"] as const,
  list: () => [...businessKeys.all, "list"] as const,
  detail: (id: string) => [...businessKeys.all, "detail", id] as const,
};

export const siteKeys = {
  all: ["sites"] as const,
  list: () => [...siteKeys.all, "list"] as const,
  detail: (id: string) => [...siteKeys.all, "detail", id] as const,
};

export const utilityKeys = {
  all: ["utilities"] as const,
  list: () => [...utilityKeys.all, "list"] as const,
  detail: (id: string) => [...utilityKeys.all, "detail", id] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardKeys.all, "overview"] as const,
};

// ============================================================================
// Business Hooks
// ============================================================================

/** Fetch all businesses for the current user. */
export function useBusinesses() {
  const { isAuthenticated } = useAuth();
  return useAppQuery<ApiResponse<{ businesses: Business[] }>>(
    businessKeys.list(),
    () => api.get<ApiResponse<{ businesses: Business[] }>>("/api/businesses"),
    { staleTime: 30_000, enabled: isAuthenticated }
  );
}

/** Fetch a single business by id. */
export function useBusiness(id: string) {
  const { isAuthenticated } = useAuth();
  return useAppQuery<ApiResponse<{ business: Business }>>(
    businessKeys.detail(id),
    () => api.get<ApiResponse<{ business: Business }>>(`/api/businesses/${id}`),
    { enabled: !!id && isAuthenticated }
  );
}

/** Create a new business. */
export function useCreateBusiness() {
  return useAppMutation<
    ApiResponse<{ business: Business; site?: Site }>,
    { name: string; address: string; postcode: string; members: BusinessMember[] }
  >(
    (input) =>
      api.post<ApiResponse<{ business: Business; site?: Site }>>(
        "/api/businesses",
        input
      ),
    {
      invalidateKeys: [businessKeys.list(), siteKeys.list()],
    }
  );
}

/** Create a new utility (contract). */
export function useCreateUtility() {
  return useAppMutation<
    ApiResponse<{ utility: Utility }>,
    {
      businessId?: string;
      siteId?: string;
      type: string;
      supplier?: string;
      identifier?: string;
      contractStart?: string;
      contractEnd?: string;
      status?: string;
      previousContractExpiry?: string;
      previousMeterId?: string;
      previousSupplier?: string;
      email?: string;
      postcode?: string;
    }
  >(
    (input) =>
      api.post<ApiResponse<{ utility: Utility }>>("/api/utilities", input),
    {
      invalidateKeys: [
        utilityKeys.list(),
        businessKeys.list(),
        siteKeys.list(),
      ],
    }
  );
}

/** Fetch all utilities for the user, optionally with parameters. */
export function useUtilities(params?: { sortBy?: string; order?: string; status?: string; search?: string }) {
  const { isAuthenticated } = useAuth();
  
  const queryParams = new URLSearchParams();
  if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
  if (params?.order) queryParams.append("order", params.order);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.search) queryParams.append("search", params.search);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/api/utilities?${queryString}` : "/api/utilities";

  // Note: utilityKeys.list() is an array like ["utilities", "list"]
  const key = params ? [...utilityKeys.list(), params] : utilityKeys.list();

  return useAppQuery<ApiResponse<{ utilities: Utility[] }>>(
    key,
    () => api.get<ApiResponse<{ utilities: Utility[] }>>(endpoint),
    { staleTime: 30_000, enabled: isAuthenticated }
  );
}

// ============================================================================
// Site Hooks
// ============================================================================

/** Fetch all sites for the current user. */
export function useSites() {
  const { isAuthenticated } = useAuth();
  return useAppQuery<ApiResponse<{ sites: Site[] }>>(
    siteKeys.list(),
    () => api.get<ApiResponse<{ sites: Site[] }>>("/api/sites"),
    { staleTime: 30_000, enabled: isAuthenticated }
  );
}

/** Fetch a single site by id (includes populated utilities). */
export function useSite(id: string) {
  const { isAuthenticated } = useAuth();
  return useAppQuery<ApiResponse<{ site: Site }>>(
    siteKeys.detail(id),
    () => api.get<ApiResponse<{ site: Site }>>(`/api/sites/${id}`),
    { enabled: !!id && isAuthenticated }
  );
}

/** Add a new site to a business. */
export function useCreateSite() {
  return useAppMutation<
    ApiResponse<{ site: Site }>,
    {
      businessId: string;
      name: string;
      address: string;
      members?: BusinessMember[];
    }
  >(
    (input) =>
      api.post<ApiResponse<{ site: Site }>>("/api/sites", input),
    {
      invalidateKeys: [siteKeys.list(), businessKeys.list()],
    }
  );
}

// ============================================================================
// Dashboard Hook
// ============================================================================

export function useDashboardOverview() {
  const { isAuthenticated } = useAuth();
  return useAppQuery<ApiResponse<{ overview: DashboardOverview }>>(
    dashboardKeys.overview(),
    () =>
      api.get<ApiResponse<{ overview: DashboardOverview }>>("/api/dashboard"),
    { staleTime: 60_000, enabled: isAuthenticated }
  );
}
