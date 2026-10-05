/** The server's message for a failed request, or a fallback. */
export function failureMessage(failure: unknown, fallback = 'Something went wrong. Try again.'): string {
  const data = (failure as { data?: { message?: string } } | undefined)?.data
  return data?.message || fallback
}
