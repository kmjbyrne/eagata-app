import type { FeedbackResponse } from '../../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> =>
  toFeedback(await useServices(event).feedback.get(getRouterParam(event, 'id')!)))
