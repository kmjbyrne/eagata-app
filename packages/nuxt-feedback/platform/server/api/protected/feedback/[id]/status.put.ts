import { feedbackStatusBody, type FeedbackResponse } from '../../../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> => {
  const { status } = await readValidatedBody(event, feedbackStatusBody.parse)
  return toFeedback(await useServices(event).feedback.setStatus(getRouterParam(event, 'id')!, status))
})
