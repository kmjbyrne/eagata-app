import { z } from 'zod'

export const storedMediaResponse = z.object({
  key: z.string(),
  /** The URL to put in content, such as an image in a feedback body. */
  src: z.string()
})

export type StoredMediaResponse = z.infer<typeof storedMediaResponse>
