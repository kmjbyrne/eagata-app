// Optional feedback from workspace members to the platform. Apps without it
// never import this entry.
export {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  InvalidFeedbackKindError,
  InvalidFeedbackStatusError,
  parseFeedbackKind,
  parseFeedbackStatus
} from './Feedback'
export type { Feedback, FeedbackId, FeedbackKind, FeedbackReply, FeedbackStatus } from './Feedback'
export {
  EmptyFeedbackBodyError,
  FEEDBACK_PAGE_PATH_MAX_LENGTH,
  FEEDBACK_SUBJECT_MAX_LENGTH,
  FeedbackService,
  InvalidFeedbackSubjectError
} from './FeedbackService'
export type { FeedbackAdapters, FeedbackInput, FeedbackPerson, FeedbackPlace, FeedbackSummaryView, FeedbackView } from './FeedbackService'
export type { FeedbackRepository, FeedbackSummary, HtmlSanitizer } from './ports'
