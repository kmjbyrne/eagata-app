import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import { describe, expect, it } from 'vitest'
import { SesEmailSender } from './SesEmailSender'

describe('SesEmailSender', () => {
  it('sends a simple UTF-8 message from the configured sender', async () => {
    const sent: unknown[] = []
    const client = { send: async (command: unknown) => sent.push(command) } as never
    await new SesEmailSender({ from: 'App <noreply@example.com>', region: 'eu-west-1' }, client).send({
      to: 'ada@example.com',
      subject: 'Reset your password',
      text: 'plain',
      html: '<p>html</p>'
    })

    expect(sent).toHaveLength(1)
    expect(sent[0]).toBeInstanceOf(SendEmailCommand)
    expect((sent[0] as SendEmailCommand).input).toEqual({
      FromEmailAddress: 'App <noreply@example.com>',
      Destination: { ToAddresses: ['ada@example.com'] },
      Content: {
        Simple: {
          Subject: { Data: 'Reset your password', Charset: 'UTF-8' },
          Body: {
            Text: { Data: 'plain', Charset: 'UTF-8' },
            Html: { Data: '<p>html</p>', Charset: 'UTF-8' }
          }
        }
      }
    })
  })
})
