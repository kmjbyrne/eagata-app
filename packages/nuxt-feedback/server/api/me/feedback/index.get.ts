import type { FeedbackSummaryResponse } from '../../../../shared/contracts/feedback'

/** The signed-in user's own feedback. */
export default defineServiceHandler(async (event): Promise<FeedbackSummaryResponse[]> =>
  (await useServices(event).feedback.listOwn()).map(toFeedbackSummary))
