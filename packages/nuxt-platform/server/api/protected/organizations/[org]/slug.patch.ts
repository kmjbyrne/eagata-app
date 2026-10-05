import { changeSlugBody, type PlatformOrg } from '../../../../../shared/contracts/platform'

/** The old slug keeps redirecting. */
export default defineServiceHandler(async (event): Promise<PlatformOrg> => {
  const { slug } = await readValidatedBody(event, changeSlugBody.parse)
  return toPlatformOrg(await useServices(event).platformOrgs.changeSlug(getRouterParam(event, 'org')!, slug))
})
