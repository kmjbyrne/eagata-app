import type { FeedbackSummaryResponse } from '../../../../../../../shared/contracts/feedback'

/** The signed-in member's own feedback in this workspace. */
export default defineServiceHandler(async (event): Promise<FeedbackSummaryResponse[]> =>
  (await useServices(event).feedback.listOwn(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!)).map(toFeedbackSummary))
