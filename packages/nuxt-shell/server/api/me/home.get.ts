import type { HomeResponse } from '../../../shared/contracts/me'

/** Where `/` should take the user. */
export default defineServiceHandler(async (event): Promise<HomeResponse> => {
  const { lastOrg, lastWorkspace } = await readSession(event)
  const home = await useServices(event).orgs.home({ org: lastOrg, workspace: lastWorkspace })
  return { path: home ? `/${home.org}/${home.workspace}` : '/choose' }
})
