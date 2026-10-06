// Each person's feedback is their own, the same from every workspace, so it
// sits at the foot of the rail rather than among a workspace's sections.
export default defineAppConfig({
  shell: {
    railLinks: [{ label: 'Feedback', icon: 'i-lucide-message-square', to: '/feedback' }]
  }
})
