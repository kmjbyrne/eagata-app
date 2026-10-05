import type { AnyExtension } from '@tiptap/core'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, Color, TextStyle } from '@tiptap/extension-text-style'
import { CharacterCount } from '@tiptap/extensions'
import { Figcaption, Figure, Iframe, LegacyImage, Video } from './legacy'

/**
 * Everything the editor adds to UEditor's StarterKit and horizontal rule
 * (UEditor's own image is turned off in favour of LegacyImage). It holds no
 * Vue code, so tests can build the same schema in Node.
 */
export function contentExtensions(): AnyExtension[] {
  return [
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TextStyle,
    Color,
    BackgroundColor,
    Superscript,
    TableKit,
    CharacterCount,
    LegacyImage,
    Figure,
    Figcaption,
    Video,
    Iframe
  ]
}
