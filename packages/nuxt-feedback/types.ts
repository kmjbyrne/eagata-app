import type { FeedbackRepository, FeedbackService } from '@kmjbyrne/core/feedback'

declare module '@kmjbyrne/nuxt-shell/types' {
  interface AppAdapters {
    /** Defaults to MariaDB when NUXT_DATABASE_URL is set. The sandbox supplies its own. */
    feedbackRepository?: FeedbackRepository
  }

  interface AppServices {
    feedback: FeedbackService
  }
}

export {}
