/** Runs a platform change, toasting the outcome. The domain's own message explains any refusal, such as "an org needs an owner". */
export function usePlatformAction() {
  const toast = useToast()
  return async function act(work: () => Promise<unknown>, done: string): Promise<boolean> {
    try {
      await work()
      toast.add({ title: done, color: 'success' })
      return true
    } catch (error) {
      const message = (error as { data?: { message?: string } }).data?.message ?? (error as Error).message
      toast.add({ title: message, color: 'error' })
      return false
    }
  }
}
