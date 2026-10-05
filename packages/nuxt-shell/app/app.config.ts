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
    /** Global components rendered under the sign-in form, by name. */
    loginExtras: [] as string[],
    /** Extra user menu entries. */
    userMenuItems: [] as ShellMenuItem[],
    /** Global components rendered at the foot of the user menu, by name. */
    userMenuExtras: [] as string[]
  }
})
