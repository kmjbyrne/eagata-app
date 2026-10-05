// The early check. The platform services check again, so a route this misses
// still can't act for anyone but a platform admin.
export default defineServiceHandler(async (event) => {
  if (!event.path.startsWith('/api/protected/')) {
    return
  }
  // This may run before the shell's actor middleware.
  await resolveActor(event)
  const me = await useServices(event).users.getMe()
  if (!me.isPlatformAdmin) {
    throw createError({ statusCode: 403, message: 'Platform admins only', data: { error: 'ForbiddenError' } })
  }
})
