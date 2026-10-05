import { feedbackReplyBody, type FeedbackResponse } from '../../../../../../../../shared/contracts/feedback'

export default defineServiceHandler(async (event): Promise<FeedbackResponse> => {
  const { body } = await readValidatedBody(event, feedbackReplyBody.parse)
  return toFeedback(await useServices(event).feedback.replyAsAuthor(getRouterParam(event, 'org')!, getRouterParam(event, 'workspace')!, getRouterParam(event, 'id')!, body))
})
