import { submitFeedbackBody, type FeedbackResponse } from '../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> => {
  const input = await readValidatedBody(event, submitFeedbackBody.parse)
  const feedback = await useServices(event).feedback.submit(input)
  setResponseStatus(event, 201)
  return toFeedback(feedback)
})
