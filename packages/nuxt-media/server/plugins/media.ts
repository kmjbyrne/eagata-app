import { MediaService } from '@kmjbyrne/core/media'

export default defineNitroPlugin(() => {
  registerServices(({ adapters, core, currentUser }) => ({
    media: new MediaService({ repositories: adapters.repositories, currentUser, access: core.workspaceAccess, storage: useMediaStorage() })
  }))
})
