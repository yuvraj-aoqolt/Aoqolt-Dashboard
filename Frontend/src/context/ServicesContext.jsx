/**
 * ServicesContext → TanStack Query
 *
 * No Provider needed. Any component can call useServices() directly.
 * TanStack Query handles caching (5 min staleTime) and deduplication.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { servicesAPI } from '../api'

export const SERVICES_QUERY_KEY = ['services']

export function useServices() {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await servicesAPI.list()
      return Array.isArray(data) ? data : data.data || data.results || []
    },
    staleTime: 5 * 60 * 1000,   // 5 min — matches old sessionStorage TTL
    gcTime: 10 * 60 * 1000,     // keep in cache 10 min after unmount
  })

  // Manual refresh — invalidates cache then re-fetches
  const fetchServices = () => {
    queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY })
    return refetch()
  }

  const getServiceById = (id) => data?.find((s) => s.id === id)

  return {
    services: data || [],
    loading: isLoading,
    error: error?.message || null,
    fetchServices,
    getServiceById,
  }
}
