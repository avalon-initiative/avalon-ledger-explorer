import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { anchor, head, NOW, witnesses } from './fixtures/heads'

const { getCosignedTreeHead, fetchTrustAnchors, buildKnownList, discoverAmong } = vi.hoisted(() => ({
  discoverAmong: vi.fn(),
  getCosignedTreeHead: vi.fn(),
  fetchTrustAnchors: vi.fn(),
  buildKnownList: vi.fn(),
}))
vi.mock('@avalon-initiative/protocol-sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@avalon-initiative/protocol-sdk')>()),
  getCosignedTreeHead,
  fetchTrustAnchors,
  buildKnownList,
  discoverAmong,
}))

import Home from '../src/views/Home.vue'

async function verify(url: string) {
  const wrapper = mount(Home)
  await wrapper.find('input[type="text"]').setValue(url)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

describe('Home', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    getCosignedTreeHead.mockReset().mockResolvedValue(head())
    fetchTrustAnchors.mockReset().mockResolvedValue([anchor])
    buildKnownList.mockReset().mockResolvedValue(witnesses)
    discoverAmong.mockReset().mockResolvedValue({ serverUrl: 'http://seed-a', entry: anchor, verified: [{ serverUrl: 'http://seed-a', latencyMs: null }] })
  })

  it('shows no result before a run', () => {
    expect(mount(Home).find('[data-testid="sth-report"]').exists()).toBe(false)
  })

  it('rejects a bad URL without touching the network', async () => {
    const wrapper = await verify('nope')
    expect(getCosignedTreeHead).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter an http(s) URL')
  })

  it('shows a verified head with each check', async () => {
    const wrapper = await verify('http://node:8080')
    expect(getCosignedTreeHead).toHaveBeenCalledWith('http://node:8080', {})
    expect(wrapper.find('[data-testid="verdict"]').text()).toBe('Verified')
    expect(wrapper.find('[data-testid="check-cosignatures"]').text()).toContain('2 valid, fresh cosignatures from 3 known witnesses; 2 required')
    expect(wrapper.text()).toContain('conformance')
  })

  it('shows not verified with the failing reason', async () => {
    getCosignedTreeHead.mockResolvedValue(head({ root_hash: 'cd'.repeat(32) }))
    const wrapper = await verify('http://node')
    expect(wrapper.find('[data-testid="verdict"]').text()).toBe('Not verified')
    expect(wrapper.find('[data-testid="check-signature"]').text()).toContain('does NOT verify')
  })

  it('shows why an unreachable node could not be verified', async () => {
    getCosignedTreeHead.mockRejectedValue(new Error('connection refused'))
    const wrapper = await verify('http://node')
    expect(wrapper.text()).toContain('connection refused')
    expect(wrapper.find('[data-testid="verdict"]').text()).toBe('Not verified')
  })

  it('connects from a published network without a typed URL', async () => {
    const wrapper = mount(Home)
    await flushPromises()
    await wrapper.find('[data-testid="network-button"]').trigger('click')
    await flushPromises()
    expect(getCosignedTreeHead).toHaveBeenCalledWith('http://seed-a', {})
    expect(wrapper.find('[data-testid="verdict"]').text()).toBe('Verified')
    expect(wrapper.find('[data-testid="current-node"]').text()).toContain('seed-a')
  })
})
