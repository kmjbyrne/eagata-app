import type { EmailMessage } from '../ports/EmailSender'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)
}

function linkEmail(to: string, subject: string, greeting: string, lines: string[], link: { url: string, label: string }, footer: string): EmailMessage {
  return {
    to,
    subject,
    text: [greeting, '', ...lines, link.url, '', footer].join('\n'),
    html: [
      `<p>${escapeHtml(greeting)}</p>`,
      ...lines.map(line => `<p>${escapeHtml(line)}</p>`),
      `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`,
      `<p>${escapeHtml(footer)}</p>`
    ].join('\n')
  }
}

export function resetEmail(to: string, name: string, url: string, minutes: number): EmailMessage {
  return linkEmail(
    to,
    'Reset your password',
    `Hi ${name},`,
    [`Use this link to set a new password. It works once and expires in ${minutes} minutes:`],
    { url, label: 'Set a new password' },
    'If you didn\'t ask for this, ignore this email. Your password hasn\'t changed.'
  )
}

export function inviteEmail(to: string, name: string, url: string, hours: number): EmailMessage {
  return linkEmail(
    to,
    'Set your password',
    `Hi ${name},`,
    [`An account has been set up for you. Use this link to choose a password. It works once and expires in ${hours} hours:`],
    { url, label: 'Choose a password' },
    'If you weren\'t expecting this, ignore this email.'
  )
}
