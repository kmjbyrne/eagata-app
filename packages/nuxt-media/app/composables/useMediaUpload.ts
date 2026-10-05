import type { StoredMediaResponse } from '../../shared/contracts/media'

/**
 * Uploads one image and resolves with its `src`, in the shape the editor's
 * `upload` prop takes. Uploads go to the workspace in the URL, or to `url`,
 * for a route that stores images its own way, such as a platform reply's.
 */
export function useMediaUpload(url?: MaybeRefOrGetter<string | undefined>) {
  const route = useRoute()
  return async (file: File): Promise<StoredMediaResponse> => {
    const target = toValue(url) ?? `/api/orgs/${route.params.org}/workspaces/${route.params.workspace}/media`
    const body = new FormData()
    body.append('file', file)
    return await $fetch<StoredMediaResponse>(target, { method: 'POST', body })
  }
}
