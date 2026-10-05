// Adds the platform area to the shell's user menu, for platform admins only.
export default defineAppConfig({
  platform: {
    /** Global components rendered on a user's platform page, by name. Each gets a `user-id` prop. */
    userExtras: [] as string[]
  },
  shell: {
    userMenuItems: [{
      label: 'Platform',
      icon: 'i-lucide-shield',
      to: '/platform',
      platformAdminOnly: true,
      whileInside: { label: 'Application', icon: 'i-lucide-layout-grid', to: '/' }
    }]
  }
})
