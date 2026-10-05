import { submitFeedbackBody, type FeedbackResponse } from '../../../../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> => {
  const input = await readValidatedBody(event, submitFeedbackBody.parse)
  const feedback = await useServices(event).feedback.submit(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, input)
  setResponseStatus(event, 201)
  return toFeedback(feedback)
})
