import type { EmailMessage, EmailSender } from '../ports/EmailSender'

/** Keeps every message instead of sending it, so tests can read them. */
export class RecordingEmailSender implements EmailSender {
  readonly outbox: EmailMessage[] = []

  async send(message: EmailMessage): Promise<void> {
    this.outbox.push(message)
  }
}
