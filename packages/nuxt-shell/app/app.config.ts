/** A user menu entry another layer adds, such as the platform area's. */
export interface ShellMenuItem {
  label: string
  icon?: string
  to: string
  /** Shown only to platform admins. */
  platformAdminOnly?: boolean
}

// Extension points. Other layers add to these lists, and Nuxt merges them,
// so the shell never imports the layers that fill them.
export default defineAppConfig({
  shell: {
    /** The app's name and logo on the sign-in page. `logo` is a URL, or empty for none. */
    brand: {
      name: 'App',
      logo: '',
      tagline: 'Sign in to continue'
    },
    /** Pages signed-out visitors may open, besides /login, such as a layer's password reset. */
    publicPaths: [] as string[],
    /** Global components rendered under the sign-in button, by name. */
    loginExtras: [] as string[],
    /** Extra user menu entries. */
    userMenuItems: [] as ShellMenuItem[],
    /** Global components rendered at the foot of the user menu, by name. */
    userMenuExtras: [] as string[],
    /** Extra tabs on the settings page, after Profile and Security. */
    settingsTabs: [] as { label: string, icon?: string, to: string }[],
    /** Global components rendered on the Security tab, after sign-in methods, by name. */
    securityExtras: [] as string[]
  }
})
