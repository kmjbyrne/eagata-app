/**
 * Stores a file the editor received and resolves with its public URL. The
 * host owns storage; the editor calls this for the image upload node, pasted
 * or dropped images, and images inside imported Word documents.
 */
export type EditorUpload = (file: File) => Promise<{ src: string }>

/**
 * Downloads a remote image the browser may not fetch itself, usually because
 * the other site sends no CORS headers. Optional: without it, such images stay
 * linked and the editor says so.
 */
export type EditorFetchRemote = (url: string) => Promise<File>
