import { describe, expect, it, vi } from 'vitest'
import { ConsoleEmailSender } from '../adapters/ConsoleEmailSender'
import { SesEmailSender } from '../adapters/SesEmailSender'
import { createEmailSender } from './createEmailSender'

const config = { sesSender: '', sesRegion: 'eu-west-1', accessKeyId: '', secretAccessKey: '' }

describe('createEmailSender', () => {
  it('sends through SES when a sender is configured', () => {
    expect(createEmailSender({ ...config, sesSender: 'App <noreply@example.com>' }, false)).toBeInstanceOf(SesEmailSender)
  })

  it('logs mail in dev with no sender', () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    expect(createEmailSender(config, true)).toBeInstanceOf(ConsoleEmailSender)
  })

  it('refuses to log mail outside dev, where the log would leak reset links', () => {
    expect(() => createEmailSender(config, false)).toThrow('NUXT_EMAIL_SES_SENDER is not set')
  })
})
