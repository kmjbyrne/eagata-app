export default defineAppConfig({
  shell: {
    brand: {
      name: 'Eagata',
      logo: '/brand.png'
    },
    navSections: [
      {
        key: 'home',
        label: 'Home',
        icon: 'i-lucide-house',
        path: '',
        items: [
          { label: 'Overview', icon: 'i-lucide-layout-grid', path: '' },
          { label: 'Recent', icon: 'i-lucide-clock', path: 'recent' },
          { label: 'Pinned', icon: 'i-lucide-pin', path: 'pinned' }
        ]
      },
      {
        key: 'editor',
        label: 'Editor',
        icon: 'i-lucide-pen-line',
        path: 'editor',
        items: [
          { label: 'Demo', icon: 'i-lucide-file-text', path: 'editor' },
          { label: 'Drafts', icon: 'i-lucide-file-pen', path: 'editor/drafts' },
          { label: 'Templates', icon: 'i-lucide-layout-template', path: 'editor/templates' }
        ]
      }
    ]
  },
  ui: {
    colors: {
      primary: 'mint',
      neutral: 'charcoal'
    }
  }
})
