/** The workspaces the user sees in an org, oldest first, and whether they may create more. */
export function useWorkspaces(orgSlug: MaybeRefOrGetter<string | undefined>) {
  const { orgs, refresh } = useOrgs()
  const org = computed(() => orgs.value.find(entry => entry.org.slug === toValue(orgSlug)))
  const workspaces = computed(() => org.value?.workspaces ?? [])
  const canCreate = computed(() => org.value?.permissions.includes('workspaces.create') ?? false)
  return { workspaces, canCreate, refresh }
}
