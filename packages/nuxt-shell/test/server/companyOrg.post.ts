import { parseEmail, type OrgRole, type User } from '@kmjbyrne/core'
import { companyOrg } from '@kmjbyrne/core/testing'

/** Test only: sets up a company org, as a platform admin would. Members are emails of people who signed up. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string, slug: string, previousSlugs?: string[], members?: [string, OrgRole][], workspaces?: string[] }>(event)
  const { repositories } = useAdapters()
  const members: [User, OrgRole][] = []
  for (const [email, role] of body.members ?? []) {
    members.push([(await repositories.users.findByEmail(parseEmail(email)))!, role])
  }
  const { org } = await companyOrg(repositories, { ...body, members })
  return { slug: org.slug }
})
