// Keeps everyone but platform admins out of the platform pages. For the user's
// sake only: the API checks every request itself.
export default defineNuxtRouteMiddleware(async () => {
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (!me.value?.isPlatformAdmin) {
    return navigateTo('/')
  }
})
