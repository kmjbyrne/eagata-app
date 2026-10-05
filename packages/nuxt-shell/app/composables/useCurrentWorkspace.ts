/** The org and workspace the URL names, as the user can see them. Undefined off a workspace page. */
export function useCurrentWorkspace() {
  const route = useRoute()
  const { orgs } = useOrgs()
  const org = computed(() => orgs.value.find(entry => entry.org.slug === route.params.org))
  const workspace = computed(() => org.value?.workspaces.find(entry => entry.slug === route.params.workspace))
  return { org, workspace }
}
