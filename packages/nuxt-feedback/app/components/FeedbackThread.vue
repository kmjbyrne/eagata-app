<script setup lang="ts">
import type { FeedbackResponse } from '../../shared/contracts/feedback'

const props = defineProps<{
  feedback: FeedbackResponse
  /** Where reply images go, when not the workspace's own media route: the platform's. */
  uploadUrl?: string
  replyUrl: string
  /** A member's reply reopens done feedback. A platform reply leaves the status alone. */
  asPlatform?: boolean
}>()

const emit = defineEmits<{ replied: [feedback: FeedbackResponse] }>()

const toast = useToast()
const reply = ref('')
const sending = ref(false)
// A new editor per reply, so the sent text and its undo history are gone.
const editorKey = ref(0)
const upload = useMediaUpload(() => props.uploadUrl)

async function send() {
  sending.value = true
  try {
    const updated = await $fetch<FeedbackResponse>(props.replyUrl, { method: 'POST', body: { body: reply.value } })
    reply.value = ''
    editorKey.value++
    emit('replied', updated)
  } catch (failure) {
    const message = (failure as { data?: { message?: string } }).data?.message ?? (failure as Error).message
    toast.add({ title: 'Couldn\'t send the reply', description: message, color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3">
    <FeedbackMessage
      :author="feedback.author.displayName"
      :from-platform="false"
      :created-at="feedback.createdAt"
      :body="feedback.body"
    />

    <FeedbackMessage
      v-for="item in feedback.replies"
      :key="item.id"
      :author="item.author.displayName"
      :from-platform="item.fromPlatform"
      :created-at="item.createdAt"
      :body="item.body"
    />

    <section
      aria-label="Reply"
      class="mt-3 overflow-hidden rounded-lg border border-default"
    >
      <EditorContent
        :key="editorKey"
        v-model="reply"
        :upload="upload"
        :toolbar="false"
        placeholder="Write a reply. Paste or drop screenshots straight in."
        compact
      />
      <div class="flex items-center justify-end gap-3 border-t border-default px-3 py-2">
        <p
          v-if="feedback.status === 'done' && !asPlatform"
          class="mr-auto text-xs text-muted"
        >
          This is marked done. Replying reopens it.
        </p>
        <UButton
          label="Send reply"
          icon="i-lucide-send"
          :loading="sending"
          @click="send"
        />
      </div>
    </section>
  </div>
</template>
