import type { FeedbackResponse } from '../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> =>
  toFeedback(await useServices(event).feedback.getOwn(getRouterParam(event, 'id')!)))
