import type { SESv2Client } from '@aws-sdk/client-sesv2'
import type { EmailMessage, EmailSender } from '@kmjbyrne/core'

export interface SesConfig {
  /** The verified sender, e.g. `App <noreply@example.com>`. */
  from: string
  region: string
  /** Blank keys use the AWS default credential chain: environment, ~/.aws, or an instance role. */
  accessKeyId?: string
  secretAccessKey?: string
}

/** Sends mail through AWS SES. The SDK loads on first send, so apps that never send never load it. */
export class SesEmailSender implements EmailSender {
  private client?: Promise<Pick<SESv2Client, 'send'>>

  constructor(
    private readonly config: SesConfig,
    client?: Pick<SESv2Client, 'send'>
  ) {
    this.client = client && Promise.resolve(client)
  }

  async send(message: EmailMessage): Promise<void> {
    const { SendEmailCommand } = await import('@aws-sdk/client-sesv2')
    await (await this.useClient()).send(new SendEmailCommand({
      FromEmailAddress: this.config.from,
      Destination: { ToAddresses: [message.to] },
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: 'UTF-8' },
          Body: {
            Text: { Data: message.text, Charset: 'UTF-8' },
            Html: { Data: message.html, Charset: 'UTF-8' }
          }
        }
      }
    }))
  }

  private useClient(): Promise<Pick<SESv2Client, 'send'>> {
    this.client ??= import('@aws-sdk/client-sesv2').then(({ SESv2Client }) => {
      const { accessKeyId, secretAccessKey, region } = this.config
      const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
      return new SESv2Client({ region, credentials })
    })
    return this.client
  }
}
