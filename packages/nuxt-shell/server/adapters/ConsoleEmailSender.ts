import type { EmailMessage, EmailSender } from '@kmjbyrne/core'

/**
 * Logs mail instead of sending it, for development without an SES sender.
 * Reset links are read straight from the server log.
 */
export class ConsoleEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[email] to=${message.to} subject=${message.subject}\n${message.text}`)
  }
}
