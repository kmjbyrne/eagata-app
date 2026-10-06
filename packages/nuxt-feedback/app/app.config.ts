// Each person's feedback is their own, the same from every workspace, so it
// lives in the user menu.
export default defineAppConfig({
  shell: {
    userMenuItems: [{ label: 'Feedback', icon: 'i-lucide-message-square', to: '/feedback' }]
  }
})
