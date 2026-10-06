export default defineAppConfig({
  shell: {
    brand: {
      name: 'Eagata',
      logo: '/brand.png'
    },
    navSections: [
      { key: 'home', label: 'Home', icon: 'i-lucide-house', path: '' },
      { key: 'editor', label: 'Editor', icon: 'i-lucide-pen-line', path: 'editor' }
    ]
  },
  ui: {
    colors: {
      primary: 'mint',
      neutral: 'charcoal'
    }
  }
})
