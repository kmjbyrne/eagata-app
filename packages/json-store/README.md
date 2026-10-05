# @kmjbyrne/json-store

Named collections of JSON documents, held in memory or in one JSON file. Use it
to try out a feature's reads and writes before it has real database tables, and
to run tests without a database. It knows nothing about any app, and has no Nuxt
dependency.

It is not a database. Every write copies the whole data set, writes run one at a
time, and queries are filters run in memory. That suits development and tests,
never production.

## Install

The package is published to npm with restricted access, so installing it needs
an npm login with access to the `@kmjbyrne` scope. It needs Zod 4 alongside it:

```bash
npm login
pnpm add @kmjbyrne/json-store zod
```

Inside this repository, depend on it from the workspace instead:

```json
{ "dependencies": { "@kmjbyrne/json-store": "workspace:*" } }
```

## Usage

Define each collection with a Zod schema for its documents. Every document needs
a string `id`:

```ts
import { defineCollections, MemoryJsonStore } from '@kmjbyrne/json-store'
import { z } from 'zod'

const collections = defineCollections({
  notes: {
    schema: z.object({ id: z.string(), title: z.string(), body: z.string() })
  }
})

const store = new MemoryJsonStore(collections)

await store.put('notes', { id: 'n1', title: 'Hello', body: '' })
const note = await store.get('notes', 'n1')
const titled = await store.find('notes', (note) => note.title !== '')
```

Collection names and document types are checked at compile time. A document that
fails its schema is rejected with an `InvalidDocumentError`, and nothing is
stored.

Several writes that must succeed or fail together go in a transaction. Use the
store the callback receives:

```ts
await store.transaction(async (tx) => {
  await tx.put('notes', first)
  await tx.put('notes', second)
})
```

If the callback throws, none of its writes are kept.

## API

- `defineCollections(definitions)` checks the names and returns the definitions.
- `combineCollections(...sets)` joins sets defined in different places, and
  throws `CollectionNameError` if two define the same name.
- `JsonStore` is the interface: `get`, `find`, `put`, `delete` and
  `transaction`.
- `MemoryJsonStore` keeps everything in memory, for tests.
- `FileJsonStore` keeps everything in one JSON file, for a development server.

Documents go in and come out as JSON copies. Mutating an object never changes
stored data. A value JSON cannot hold, such as a `Date`, comes back as JSON
holds it, so store dates as ISO strings.

Calling the outer store's `put`, `delete` or `transaction` from inside a
transaction throws `NestedWriteError`. Waiting for the transaction to finish
would otherwise deadlock.

## The File

`new FileJsonStore({ file: '.data/store.json', collections })` reads the file on
first use and rewrites it after every write. A missing file is created, along
with its directories. If a write to the file fails, the change is dropped from
memory too, so the two never disagree.

The file holds each collection as an array under its name, with bookkeeping
under `_meta`:

```json
{
  "_meta": { "version": 1 },
  "notes": [{ "id": "n1", "title": "Hello", "body": "" }]
}
```

Keys that no collection defines are kept untouched, so data for a collection you
have stopped defining is not lost. Only one process should use a file at a time.

## The Contract

`@kmjbyrne/json-store/contract` exports `jsonStoreContract`, a Vitest suite that
every `JsonStore` must pass. Run it with a function that returns a new, empty
store over `contractCollections`:

```ts
import { describe } from 'vitest'
import {
  contractCollections,
  jsonStoreContract
} from '@kmjbyrne/json-store/contract'

describe('MyStore', () => {
  jsonStoreContract(() => new MyStore(contractCollections))
})
```
