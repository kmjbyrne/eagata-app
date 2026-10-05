import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repositoryContract } from '@kmjbyrne/core/contract'
import { FileJsonStore, MemoryJsonStore } from '@kmjbyrne/json-store'
import { afterAll, describe } from 'vitest'
import { tenancyCollections } from './collections'
import { JsonStoreRepositories } from './JsonStoreRepositories'

const empty = () => tenancyCollections({ users: [], orgs: [], workspaces: [], memberships: [], workspaceMembers: [] })

describe('JsonStoreRepositories on MemoryJsonStore', () => {
  const repositories = new JsonStoreRepositories(new MemoryJsonStore(empty()))
  repositoryContract(() => repositories)
})

describe('JsonStoreRepositories on FileJsonStore', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sandbox-store-'))
  const repositories = new JsonStoreRepositories(new FileJsonStore({ file: join(directory, 'store.json'), collections: empty() }))
  afterAll(() => rm(directory, { recursive: true, force: true }))
  repositoryContract(() => repositories)
})
