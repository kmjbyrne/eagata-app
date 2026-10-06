<script setup lang="ts">
const props = defineProps<{ width: number, min: number, max: number, label: string }>()
const emit = defineEmits<{ resize: [width: number, done: boolean] }>()

// Drags in pixels, sizes in rem, so a larger root font keeps its proportions.
let start: { x: number, width: number, rem: number } | undefined
const clamp = (width: number) => Math.round(Math.min(props.max, Math.max(props.min, width)) * 4) / 4

function down(event: PointerEvent) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  start = { x: event.clientX, width: props.width, rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) }
}

function move(event: PointerEvent) {
  if (start) {
    emit('resize', clamp(start.width + (event.clientX - start.x) / start.rem), false)
  }
}

function up(event: PointerEvent) {
  if (start) {
    emit('resize', clamp(start.width + (event.clientX - start.x) / start.rem), true)
    start = undefined
  }
}
</script>

<template>
  <!-- Inside the column's right edge, from md up, since the sidebar clips
       anything past its own edge. Phones get a fixed slideover. -->
  <div
    role="separator"
    aria-orientation="vertical"
    :aria-label="label"
    class="group absolute inset-y-0 end-0 z-10 hidden w-2 cursor-col-resize touch-none md:block"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="up"
    @pointercancel="up"
  >
    <div class="ms-auto h-full w-px transition-colors group-hover:bg-primary group-active:bg-primary" />
  </div>
</template>
