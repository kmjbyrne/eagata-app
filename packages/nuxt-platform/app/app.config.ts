// Adds the platform area to the shell's user menu, for platform admins only.
export default defineAppConfig({
  shell: {
    userMenuItems: [{ label: 'Platform', icon: 'i-lucide-shield', to: '/platform', platformAdminOnly: true }]
  }
})
