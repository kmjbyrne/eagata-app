export interface NavPrefs {
  /** The rail and panel show on wide screens. Phones open them as a slideover. */
  visible: boolean
  /** The rail is wide, with labels beside its icons. */
  pinned: boolean
  /** The active section's panel shows, if it has one. */
  panelOpen: boolean
}

const defaults: NavPrefs = { visible: true, pinned: false, panelOpen: true }

/**
 * How much navigation is on screen. Kept in a cookie, so the server renders
 * the person's layout on first paint, and shared through state, because two
 * `useCookie` refs of one name don't follow each other on a page.
 */
export function useNavPrefs() {
  const cookie = useCookie<Partial<NavPrefs> | undefined>('shell-nav', {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  const prefs = useState<NavPrefs>('shell:nav-prefs', () => ({ ...defaults, ...cookie.value }))

  function toggle(key: keyof NavPrefs) {
    prefs.value = { ...prefs.value, [key]: !prefs.value[key] }
    cookie.value = prefs.value
  }

  return { prefs: readonly(prefs), toggle }
}
