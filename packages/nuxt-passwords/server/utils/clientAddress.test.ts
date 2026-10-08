import type { IncomingMessage, ServerResponse } from 'node:http'
import { createEvent } from 'h3'
import { describe, expect, it } from 'vitest'
import { clientAddress } from './clientAddress'

function request(headers: Record<string, string | string[]>) {
  const req = { headers, socket: { remoteAddress: '10.0.0.2' } } as unknown as IncomingMessage
  return createEvent(req, {} as ServerResponse)
}

describe('clientAddress', () => {
  it('takes the entry the proxy appended, ignoring any the client sent before it', () => {
    expect(clientAddress(request({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }), true)).toBe('203.0.113.7')
    expect(clientAddress(request({ 'x-forwarded-for': '203.0.113.7' }), true)).toBe('203.0.113.7')
  })

  it('reads repeated headers as one list', () => {
    expect(clientAddress(request({ 'x-forwarded-for': ['9.9.9.9', '203.0.113.7'] }), true)).toBe('203.0.113.7')
  })

  it('falls back to the socket without the header', () => {
    expect(clientAddress(request({}), true)).toBe('10.0.0.2')
  })

  it('ignores the header unless the proxy is trusted', () => {
    expect(clientAddress(request({ 'x-forwarded-for': '203.0.113.7' }), false)).toBe('10.0.0.2')
  })
})
