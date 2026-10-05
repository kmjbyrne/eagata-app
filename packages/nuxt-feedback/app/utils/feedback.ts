import type { FeedbackKindValue, FeedbackStatusValue } from '../../shared/contracts/feedback'

export const FEEDBACK_KIND_ITEMS: { label: string, value: FeedbackKindValue, icon: string, description: string }[] = [
  { label: 'Bug', value: 'bug', icon: 'i-lucide-bug', description: 'Something is broken or wrong' },
  { label: 'Idea', value: 'idea', icon: 'i-lucide-lightbulb', description: 'Something we could add or improve' },
  { label: 'Question', value: 'question', icon: 'i-lucide-circle-help', description: 'You\'re not sure how to do something' },
  { label: 'Other', value: 'other', icon: 'i-lucide-message-square', description: 'Anything else' }
]

export const FEEDBACK_STATUS_ITEMS: { label: string, value: FeedbackStatusValue, color: 'info' | 'warning' | 'success' }[] = [
  { label: 'New', value: 'new', color: 'info' },
  { label: 'Seen', value: 'seen', color: 'warning' },
  { label: 'Done', value: 'done', color: 'success' }
]

export function feedbackKind(kind: string) {
  return FEEDBACK_KIND_ITEMS.find(item => item.value === kind) ?? { label: kind, value: kind, icon: 'i-lucide-message-square', description: '' }
}

export function feedbackStatus(status: string) {
  return FEEDBACK_STATUS_ITEMS.find(item => item.value === status) ?? { label: status, value: status, color: 'neutral' as const }
}
