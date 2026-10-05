// Signed-out visitors go to /login. The API checks every request anyway; this
// keeps pages from rendering for nobody.
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || useAppConfig().shell.publicPaths.includes(to.path)) {
    return
  }
  const { me, refresh } = useMe()
  if (!me.value) {
    await refresh()
  }
  if (!me.value) {
    return navigateTo('/login')
  }
})
