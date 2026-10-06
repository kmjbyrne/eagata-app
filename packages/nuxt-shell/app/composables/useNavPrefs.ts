export interface NavPrefs {
  /** The rail and panel show on wide screens. Phones open them as a slideover. */
  visible: boolean
  /** The rail is wide, with labels beside its icons. */
  pinned: boolean
  /** The active section's panel shows, if it has one. */
  panelOpen: boolean
  /** The rail's width in rem, from md up. Labels show from `RAIL.labels`. */
  railWidth: number
  /** The panel's width in rem, from md up. */
  panelWidth: number
}

/** Rail widths, in rem: icons only, pinned, where labels start, and the limits. */
export const RAIL = { narrow: 3.5, wide: 11, labels: 8, max: 20 }
/** Panel widths, in rem. */
export const PANEL = { min: 8, default: 11, max: 30 }

const defaults: NavPrefs = { visible: true, pinned: false, panelOpen: true, railWidth: RAIL.narrow, panelWidth: PANEL.default }

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

  function save(next: NavPrefs) {
    prefs.value = next
    cookie.value = next
  }

  /** Pinning sets the rail to its wide width, and unpinning to its narrow one. */
  function toggle(key: 'visible' | 'pinned' | 'panelOpen') {
    const on = !prefs.value[key]
    save({ ...prefs.value, [key]: on, ...(key === 'pinned' ? { railWidth: on ? RAIL.wide : RAIL.narrow } : {}) })
  }

  /**
   * Sets a column's width while it's dragged, saving it to the cookie only
   * when `done`. A rail wide enough for labels counts as pinned.
   */
  function resize(key: 'railWidth' | 'panelWidth', width: number, done = false) {
    const next = { ...prefs.value, [key]: width, ...(key === 'railWidth' ? { pinned: width >= RAIL.labels } : {}) }
    if (done) {
      save(next)
    } else {
      prefs.value = next
    }
  }

  return { prefs: readonly(prefs), toggle, resize }
}
