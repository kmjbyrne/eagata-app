import { feedbackReplyBody, type FeedbackResponse } from '../../../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> => {
  const { body } = await readValidatedBody(event, feedbackReplyBody.parse)
  return toFeedback(await useServices(event).feedback.replyAsPlatform(getRouterParam(event, 'id')!, body))
})
