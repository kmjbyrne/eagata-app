import type { FeedbackSummaryResponse } from '../../../../../shared/contracts/feedback'

/** Every workspace's feedback, latest activity first. */
export default defineServiceHandler(async (event): Promise<FeedbackSummaryResponse[]> =>
  (await useServices(event).feedback.listAll()).map(toFeedbackSummary))
