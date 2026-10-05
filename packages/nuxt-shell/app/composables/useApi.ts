export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
}

/**
 * `$fetch` for URLs built at runtime. Nuxt's typed `$fetch` compares a runtime
 * string against every route the app has, which TypeScript gives up on once
 * an app has enough routes.
 */
export function useApi() {
  return $fetch as unknown as <T = unknown>(url: string, options?: ApiOptions) => Promise<T>
}
