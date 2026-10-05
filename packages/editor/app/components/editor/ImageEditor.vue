<script setup lang="ts">
import type Cropper from 'cropperjs'
import { contains, fitInside, intersect, type Rect } from '../../utils/cropBounds'
import { EDITED_IMAGE_MAX_EDGE, editableImageSrc, editedImageFile } from '../../utils/imageExport'
import type { EditorUpload } from '../../utils/editorUpload'

const props = defineProps<{
  src: string
  upload: EditorUpload
}>()

const emit = defineEmits<{
  saved: [src: string]
}>()

const open = defineModel<boolean>('open', { required: true })

const toast = useToast()
const imageRef = useTemplateRef('imageRef')
const saving = ref(false)
const ratio = ref('free')
const loadSrc = computed(() => import.meta.client ? editableImageSrc(props.src, window.location.origin, String(Date.now())) : props.src)
let cropper: Cropper | null = null

const RATIOS: Record<string, number> = { 'free': Number.NaN, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 }
const ratioItems = Object.keys(RATIOS).map(value => ({ label: value === 'free' ? 'Free' : value, value }))

// Dragging outside the selection pans the image; the wheel zooms it.
const TEMPLATE = `
<cropper-canvas background>
  <cropper-image rotatable scalable translatable crossorigin="anonymous"></cropper-image>
  <cropper-shade theme-color="rgba(0, 0, 0, 0.55)"></cropper-shade>
  <cropper-handle action="move" plain></cropper-handle>
  <cropper-selection movable resizable>
    <cropper-grid role="grid" covered></cropper-grid>
    <cropper-crosshair centered></cropper-crosshair>
    <cropper-handle action="move" theme-color="transparent"></cropper-handle>
    <cropper-handle action="n-resize"></cropper-handle>
    <cropper-handle action="e-resize"></cropper-handle>
    <cropper-handle action="s-resize"></cropper-handle>
    <cropper-handle action="w-resize"></cropper-handle>
    <cropper-handle action="ne-resize"></cropper-handle>
    <cropper-handle action="nw-resize"></cropper-handle>
    <cropper-handle action="se-resize"></cropper-handle>
    <cropper-handle action="sw-resize"></cropper-handle>
  </cropper-selection>
</cropper-canvas>`

function destroy() {
  cropper?.destroy()
  cropper = null
}

// cropperjs defines custom elements on import, so load it in the browser only.
watch(imageRef, async (element) => {
  destroy()
  if (!element) {
    return
  }
  const { default: CropperClass } = await import('cropperjs')
  cropper = new CropperClass(element, { template: TEMPLATE })
  const cropperImage = image()
  const current = selection()
  if (!cropperImage || !current) {
    return
  }
  // cropperjs 2 has no view mode, so keep the crop box on the photo here:
  // refuse moves that leave it, and pull it back after the photo moves.
  current.addEventListener('change', (event) => {
    const bounds = photoBounds()
    if (bounds && !contains(bounds, (event as CustomEvent<Rect>).detail)) {
      event.preventDefault()
    }
  })
  cropperImage.addEventListener('transform', afterTransform)
  await cropperImage.$ready()
  fitSelection(0.9)
})

// Measure once the transform is applied, which is after the event fires.
function afterTransform() {
  requestAnimationFrame(() => requestAnimationFrame(keepSelectionOnPhoto))
}

// The dialog scales in, so measurements taken while it opens are off.
function onOpened() {
  image()?.$center('contain')
  fitSelection(0.9)
}

function zoom(step: number) {
  image()?.$zoom(step)
  afterTransform()
}

watch(open, (value) => {
  if (!value) {
    destroy()
    ratio.value = 'free'
  }
})

onBeforeUnmount(destroy)

function image() {
  return cropper?.getCropperImage()
}

function selection() {
  return cropper?.getCropperSelection()
}

/** The visible part of the photo, in the canvas's coordinates. */
function photoBounds(): Rect | null {
  const canvas = cropper?.getCropperCanvas()
  const photo = image()
  if (!canvas || !photo) {
    return null
  }
  const c = canvas.getBoundingClientRect()
  const p = photo.getBoundingClientRect()
  return intersect(
    { x: 0, y: 0, width: c.width, height: c.height },
    { x: p.left - c.left, y: p.top - c.top, width: p.width, height: p.height }
  )
}

function fitSelection(coverage = 1) {
  const bounds = photoBounds()
  const current = selection()
  if (bounds && current) {
    const { x, y, width, height } = fitInside(bounds, current.aspectRatio, coverage)
    current.$change(x, y, width, height, undefined, true)
  }
}

function keepSelectionOnPhoto() {
  const bounds = photoBounds()
  const current = selection()
  if (bounds && current && !contains(bounds, current)) {
    fitSelection()
  }
}

watch(ratio, (value) => {
  const current = selection()
  if (current) {
    current.aspectRatio = RATIOS[value] ?? Number.NaN
    fitSelection(0.9)
  }
})

function rotate(angle: string) {
  image()?.$rotate(angle).$center('contain')
  requestAnimationFrame(() => fitSelection(0.9))
}

function reset() {
  image()?.$resetTransform().$center('contain')
  ratio.value = 'free'
  requestAnimationFrame(() => fitSelection(0.9))
}

// The canvas shows the image scaled to fit; export at the source's own
// resolution instead, capped so phone photos don't upload at full size.
async function exportSize() {
  const cropperImage = image()
  const current = selection()
  if (!cropperImage || !current) {
    throw new Error('The image is not ready yet')
  }
  await cropperImage.$ready()
  const [a = 1, b = 0] = cropperImage.$getTransform()
  const displayScale = Math.hypot(a, b)
  const width = current.width / displayScale
  const height = current.height / displayScale
  const cap = Math.min(1, EDITED_IMAGE_MAX_EDGE / Math.max(width, height))
  return { selection: current, width: Math.round(width * cap), height: Math.round(height * cap) }
}

async function save() {
  saving.value = true
  try {
    const { selection: current, width, height } = await exportSize()
    const target = editedImageFile(props.src)
    const canvas = await current.$toCanvas({ width, height })
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      result => result ? resolve(result) : reject(new Error('Could not export the edited image')),
      target.type,
      target.quality
    ))
    const { src } = await props.upload(new File([blob], target.name, { type: target.type }))
    emit('saved', src)
    open.value = false
  } catch (e) {
    toast.add({ title: 'Could not save the image', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit image"
    description="Drag the corners to crop. Drag the photo to move it, and scroll to zoom."
    :ui="{ content: 'sm:max-w-4xl', body: 'flex flex-col gap-3' }"
    @after:enter="onOpened"
  >
    <template #body>
      <div class="flex flex-wrap items-center gap-1">
        <UTabs
          v-model="ratio"
          :items="ratioItems"
          :content="false"
          size="xs"
          aria-label="Crop shape"
        />
        <USeparator
          orientation="vertical"
          class="mx-1 h-6"
        />
        <UTooltip text="Zoom out">
          <UButton
            icon="i-lucide-zoom-out"
            color="neutral"
            variant="ghost"
            aria-label="Zoom out"
            @click="zoom(-0.1)"
          />
        </UTooltip>
        <UTooltip text="Zoom in">
          <UButton
            icon="i-lucide-zoom-in"
            color="neutral"
            variant="ghost"
            aria-label="Zoom in"
            @click="zoom(0.1)"
          />
        </UTooltip>
        <UTooltip text="Rotate left">
          <UButton
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="ghost"
            aria-label="Rotate left"
            @click="rotate('-90deg')"
          />
        </UTooltip>
        <UTooltip text="Rotate right">
          <UButton
            icon="i-lucide-rotate-cw"
            color="neutral"
            variant="ghost"
            aria-label="Rotate right"
            @click="rotate('90deg')"
          />
        </UTooltip>
        <UTooltip text="Flip horizontally">
          <UButton
            icon="i-lucide-flip-horizontal-2"
            color="neutral"
            variant="ghost"
            aria-label="Flip horizontally"
            @click="image()?.$scale(-1, 1)"
          />
        </UTooltip>
        <UTooltip text="Flip vertically">
          <UButton
            icon="i-lucide-flip-vertical-2"
            color="neutral"
            variant="ghost"
            aria-label="Flip vertically"
            @click="image()?.$scale(1, -1)"
          />
        </UTooltip>
        <UTooltip text="Undo all changes">
          <UButton
            icon="i-lucide-undo-2"
            color="neutral"
            variant="ghost"
            aria-label="Reset"
            @click="reset"
          />
        </UTooltip>
      </div>

      <div class="h-[60vh] min-h-80 overflow-hidden rounded-md bg-elevated [&_cropper-canvas]:size-full">
        <img
          v-if="open"
          ref="imageRef"
          :src="loadSrc"
          crossorigin="anonymous"
          alt=""
          class="hidden"
        >
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          label="Save image"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
