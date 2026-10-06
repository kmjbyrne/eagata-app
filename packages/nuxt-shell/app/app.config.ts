/** A user menu entry another layer adds, such as the platform area's. */
export interface ShellMenuItem {
  label: string
  icon?: string
  to: string
  /** Shown only to platform admins. */
  platformAdminOnly?: boolean
  /** Shown in its place while the user is inside `to`, such as a way back to the app. */
  whileInside?: { label: string, icon?: string, to: string }
}

/** A feature flag a layer declares, as platform admins see it. */
export interface ShellFeature {
  label: string
  description?: string
}

/** A sub-section, listed in a section's second rail. A row, not a link, until a page is at its path. */
export interface ShellNavItem {
  label: string
  icon?: string
  path: string
}

/** A section of the app's navigation, inside the current workspace. */
export interface ShellNavSection {
  key: string
  label: string
  icon: string
  /** Path inside the current workspace, such as 'boards'. Empty for the workspace home. */
  path: string
  /** A global component, by name, drawn in the second rail while this section is active. */
  panel?: string
  /** Sub-sections, listed in the second rail when there's no `panel`. Paths as `path`. */
  items?: ShellNavItem[]
  /** Lower first. Sections without one keep the order the layers gave. */
  order?: number
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
    /** The rail's sections. Members is the shell's own, and comes last. */
    navSections: [{
      key: 'members',
      label: 'Members',
      icon: 'i-lucide-users',
      path: 'members',
      order: 100,
      items: [
        { label: 'All members', icon: 'i-lucide-users', path: 'members' },
        { label: 'Invitations', icon: 'i-lucide-mail', path: 'members/invitations' }
      ]
    }] as ShellNavSection[],
    /** Extra user menu entries. */
    userMenuItems: [] as ShellMenuItem[],
    /** Global components rendered at the foot of the user menu, by name. */
    userMenuExtras: [] as string[],
    /** Extra tabs on the settings page, after Profile and Security. */
    settingsTabs: [] as { label: string, icon?: string, to: string, platformAdminOnly?: boolean }[],
    /** Global components rendered on the Security tab, after sign-in methods, by name. */
    securityExtras: [] as string[],
    /**
     * Feature flags, by name, declared by the layer that owns each feature.
     * Every flag is off until a platform admin switches it on for an org.
     */
    features: {} as Record<string, ShellFeature>
  }
})
