import { describe, expect, it } from 'vitest'
import { hostOf, networkChoices, nodeChoices } from '../src/utils/connectOptions'

describe('connectOptions', () => {
  it('describes a network by its tier', () => {
    expect(networkChoices([{ networkId: 'lan', label: 'x', environment: 'dev' }])).toEqual([{ value: 'lan', label: 'lan', description: 'Development' }])
  })
  it('shows a node by host with its round trip', () => {
    expect(nodeChoices([{ serverUrl: 'http://a:8080', latencyMs: 2.4 }, { serverUrl: 'http://b:8080', latencyMs: null }])).toEqual([
      { value: 'http://a:8080', label: 'a:8080', description: '2 ms', title: 'http://a:8080' },
      { value: 'http://b:8080', label: 'b:8080', description: undefined, title: 'http://b:8080' },
    ])
  })
  it('keeps text that is not a url', () => {
    expect(hostOf('nope')).toBe('nope')
  })
})
