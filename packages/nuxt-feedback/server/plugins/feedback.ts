import { FeedbackService } from '@kmjbyrne/core/feedback'
import { MediaService } from '@kmjbyrne/core/media'
import { SanitizeHtmlSanitizer } from '../adapters/SanitizeHtmlSanitizer'

export default defineNitroPlugin(() => {
  const sanitizer = new SanitizeHtmlSanitizer()

  registerServices(({ adapters, core, currentUser }) => ({
    feedback: new FeedbackService({
      repositories: adapters.repositories,
      currentUser,
      access: core.workspaceAccess,
      feedback: useFeedbackRepository(),
      sanitizer,
      media: new MediaService({ repositories: adapters.repositories, currentUser, access: core.workspaceAccess, storage: useMediaStorage() }),
      ids: adapters.ids
    })
  }))
})
