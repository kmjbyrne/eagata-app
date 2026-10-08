import type { EmailSender } from '@kmjbyrne/core'
import { ConsoleEmailSender } from '../adapters/ConsoleEmailSender'
import { SesEmailSender } from '../adapters/SesEmailSender'

export interface EmailConfig {
  sesSender: string
  sesRegion: string
  accessKeyId: string
  secretAccessKey: string
}

/**
 * Logs mail in place of sending it in dev only. Anywhere else the log would
 * hand anyone who reads it live reset and invite links.
 */
export function createEmailSender(email: EmailConfig, dev: boolean): EmailSender {
  if (email.sesSender) {
    return new SesEmailSender({ from: email.sesSender, region: email.sesRegion, accessKeyId: email.accessKeyId, secretAccessKey: email.secretAccessKey })
  }
  if (!dev) {
    throw new Error('NUXT_EMAIL_SES_SENDER is not set, so mail has no way to be sent')
  }
  console.info('[email] No SES sender configured: mail is logged, not sent.')
  return new ConsoleEmailSender()
}
