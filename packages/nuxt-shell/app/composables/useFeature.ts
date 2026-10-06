/**
 * Whether the current org has a flagged feature switched on, such as
 * `useFeature('progressBoard')`. For showing a page or nav entry: the
 * feature's services check again, so hiding is never the only guard.
 */
export function useFeature(feature: string) {
  const { org } = useCurrentWorkspace()
  return computed(() => org.value?.features.includes(feature) ?? false)
}
