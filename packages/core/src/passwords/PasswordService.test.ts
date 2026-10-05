import { describe, expect, it } from 'vitest'
import type { ProviderIdentity } from '../entities/User'
import { AccountDeactivatedError, ForbiddenError, NotSignedInError } from '../errors'
import { TooManyAttemptsError } from '../ports/RateLimiter'
import { CountingRateLimiter } from '../testing/CountingRateLimiter'
import { createTestServices } from '../testing/createTestServices'
import { RecordingEmailSender } from '../testing/RecordingEmailSender'
import { parseEmail } from '../values/Email'
import { passwordRepositoryContract } from '../testing/passwordRepositoryContract'
import { InvalidCredentialsError, InvalidResetTokenError, WrongPasswordError } from './errors'
import { InMemoryPasswordRepository, PlainPasswordHasher } from './InMemoryPasswordRepository'
import { InvalidPasswordError } from './Password'
import { PasswordService } from './PasswordService'

function setup() {
  const passwords = new InMemoryPasswordRepository()
  const mail = new RecordingEmailSender()
  const limiter = new CountingRateLimiter()
  const holder: { service?: PasswordService } = {}
  const t = createTestServices({ linkProof: { requiredFor: id => holder.service!.linkProof().requiredFor(id) } })
  let clock = new Date('2026-06-01T12:00:00.000Z')
  const service = new PasswordService({ repositories: t.repositories, passwords, hasher: new PlainPasswordHasher(), mail, limiter, currentUser: t.currentUser, now: () => clock })
  holder.service = service
  const tick = (ms: number) => {
    clock = new Date(clock.getTime() + ms)
  }
  const tokenFrom = (index = -1) => /token=([\w-]+)/.exec(mail.outbox.at(index)!.text)![1]!
  const url = (token: string) => `https://app.example.com/reset-password?token=${token}`
  return { t, service, passwords, mail, tick, tokenFrom, url }
}

async function withPassword(ctx: ReturnType<typeof setup>, name: string, password = 'correct horse battery') {
  const user = await ctx.t.addUser(name)
  await ctx.passwords.setHash(user.id, `plain:${password}`, new Date())
  return user
}

const google = (email: string): ProviderIdentity =>
  ({ provider: 'google', subject: `g-${email}`, email: parseEmail(email), emailVerified: true, name: null, picture: 'https://example.com/p.png' })

describe('PasswordService.signIn', () => {
  it('signs in with the right password, and refuses a wrong one or an unknown email alike', async () => {
    const ctx = setup()
    const ada = await withPassword(ctx, 'Ada Lovelace')

    expect((await ctx.service.signIn('Ada.Lovelace@example.com', 'correct horse battery')).id).toBe(ada.id)
    await expect(ctx.service.signIn(ada.email, 'wrong password!')).rejects.toThrow(InvalidCredentialsError)
    await expect(ctx.service.signIn('nobody@example.com', 'correct horse battery')).rejects.toThrow(InvalidCredentialsError)
  })

  it('refuses a user with no password', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')

    await expect(ctx.service.signIn(grace.email, 'anything at all')).rejects.toThrow(InvalidCredentialsError)
  })

  it('says a deactivated account is deactivated only once the password is right', async () => {
    const ctx = setup()
    const ada = await withPassword(ctx, 'Ada Lovelace')
    await ctx.t.repositories.users.update({ ...ada, deactivatedAt: new Date() })

    await expect(ctx.service.signIn(ada.email, 'wrong password!')).rejects.toThrow(InvalidCredentialsError)
    await expect(ctx.service.signIn(ada.email, 'correct horse battery')).rejects.toThrow(AccountDeactivatedError)
  })

  it('stops after five failures for the account, and a success resets the count', async () => {
    const ctx = setup()
    const ada = await withPassword(ctx, 'Ada Lovelace')
    for (let i = 0; i < 4; i++) {
      await expect(ctx.service.signIn(ada.email, 'wrong password!')).rejects.toThrow(InvalidCredentialsError)
    }
    await ctx.service.signIn(ada.email, 'correct horse battery')
    for (let i = 0; i < 5; i++) {
      await expect(ctx.service.signIn(ada.email, 'wrong password!')).rejects.toThrow(InvalidCredentialsError)
    }

    await expect(ctx.service.signIn(ada.email, 'correct horse battery')).rejects.toThrow(TooManyAttemptsError)
  })
})

describe('Google sign-in for a user with a password', () => {
  it('asks for the password, then links and signs in', async () => {
    const ctx = setup()
    const ada = await withPassword(ctx, 'Ada Lovelace')
    const result = await ctx.t.services.auth.signIn(google(ada.email))
    if (result.kind !== 'link-required') {
      throw new Error('expected link-required')
    }

    await expect(ctx.service.linkIdentity(result.link, 'wrong password!')).rejects.toThrow(InvalidCredentialsError)
    const linked = await ctx.service.linkIdentity(result.link, 'correct horse battery')
    expect(linked.identities).toEqual([{ provider: 'google', subject: `g-${ada.email}`, linkedAt: expect.any(Date) }])
    expect(linked.avatarUrl).toBe('https://example.com/p.png')
    expect((await ctx.t.services.auth.signIn(google(ada.email))).kind).toBe('signed-in')
  })

  it('links straight away for a user without a password', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')

    expect((await ctx.t.services.auth.signIn(google(grace.email))).kind).toBe('signed-in')
  })
})

describe('PasswordService.setPassword', () => {
  it('sets a first password without asking for a current one', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')
    ctx.t.signInAs(grace)
    expect(await ctx.service.hasPassword()).toBe(false)

    await ctx.service.setPassword({ password: 'a brand new one' })
    expect(await ctx.service.hasPassword()).toBe(true)
    expect((await ctx.service.signIn(grace.email, 'a brand new one')).id).toBe(grace.id)
  })

  it('changes a password only with the current one, and checks the new one\'s length', async () => {
    const ctx = setup()
    const ada = await withPassword(ctx, 'Ada Lovelace')
    ctx.t.signInAs(ada)

    await expect(ctx.service.setPassword({ password: 'a brand new one' })).rejects.toThrow(WrongPasswordError)
    await expect(ctx.service.setPassword({ current: 'correct horse battery', password: 'short' })).rejects.toThrow(InvalidPasswordError)
    await ctx.service.setPassword({ current: 'correct horse battery', password: 'a brand new one' })
    await expect(ctx.service.signIn(ada.email, 'correct horse battery')).rejects.toThrow(InvalidCredentialsError)
  })

  it('needs a signed-in user', async () => {
    await expect(setup().service.setPassword({ password: 'a brand new one' })).rejects.toThrow(NotSignedInError)
  })
})

describe('password resets', () => {
  it('emails a link that sets a password once, and signs in with it', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')
    await ctx.service.requestReset(grace.email, ctx.url)
    const token = ctx.tokenFrom()

    expect(ctx.mail.outbox[0]).toMatchObject({ to: grace.email, subject: 'Reset your password' })
    expect((await ctx.service.resetPassword(token, 'a brand new one')).id).toBe(grace.id)
    await expect(ctx.service.resetPassword(token, 'another new one')).rejects.toThrow(InvalidResetTokenError)
    expect((await ctx.service.signIn(grace.email, 'a brand new one')).id).toBe(grace.id)
  })

  it('says nothing, and sends nothing, for unknown or deactivated accounts', async () => {
    const ctx = setup()
    const dana = await ctx.t.addUser('Dana Deactivated')
    await ctx.t.repositories.users.update({ ...dana, deactivatedAt: new Date() })
    await ctx.service.requestReset('nobody@example.com', ctx.url)
    await ctx.service.requestReset(dana.email, ctx.url)

    expect(ctx.mail.outbox).toEqual([])
  })

  it('keeps only the newest link, expires it after 30 minutes, and keeps it through a too-short password', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')
    await ctx.service.requestReset(grace.email, ctx.url)
    const first = ctx.tokenFrom()
    await ctx.service.requestReset(grace.email, ctx.url)
    const second = ctx.tokenFrom()

    await expect(ctx.service.resetPassword(first, 'a brand new one')).rejects.toThrow(InvalidResetTokenError)
    await expect(ctx.service.resetPassword(second, 'short')).rejects.toThrow(InvalidPasswordError)
    ctx.tick(31 * 60 * 1000)
    await expect(ctx.service.resetPassword(second, 'a brand new one')).rejects.toThrow(InvalidResetTokenError)
  })

  it('sends at most three emails an hour to one address', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')
    for (let i = 0; i < 5; i++) {
      await ctx.service.requestReset(grace.email, ctx.url)
    }

    expect(ctx.mail.outbox).toHaveLength(3)
  })
})

describe('PasswordService.sendInvite', () => {
  it('lets a platform admin email a link that lasts three days', async () => {
    const ctx = setup()
    const pat = await ctx.t.addUser('Pat Platform', { platformAdmin: true })
    const grace = await ctx.t.addUser('Grace Hopper')
    ctx.t.signInAs(pat)
    await ctx.service.sendInvite(grace.id, ctx.url)

    expect(ctx.mail.outbox[0]).toMatchObject({ to: grace.email, subject: 'Set your password' })
    ctx.tick(71 * 60 * 60 * 1000)
    expect((await ctx.service.resetPassword(ctx.tokenFrom(), 'a brand new one')).id).toBe(grace.id)
  })

  it('refuses anyone but a platform admin', async () => {
    const ctx = setup()
    const grace = await ctx.t.addUser('Grace Hopper')
    ctx.t.signInAs(grace)

    await expect(ctx.service.sendInvite(grace.id, ctx.url)).rejects.toThrow(ForbiddenError)
  })
})

passwordRepositoryContract(() => new InMemoryPasswordRepository())
