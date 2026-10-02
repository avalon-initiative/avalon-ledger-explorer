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

async function pickNetwork(wrapper: ReturnType<typeof mount>, filter = '') {
  await wrapper.find('[data-testid="network-select"] button').trigger('click')
  if (filter) await wrapper.find('[data-testid="network-select"] input').setValue(filter)
  await wrapper.find('[data-testid="network-select"] [role="option"]').trigger('click')
}

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
    await pickNetwork(wrapper)
    await flushPromises()
    expect(getCosignedTreeHead).toHaveBeenCalledWith('http://seed-a', {})
    expect(wrapper.find('[data-testid="verdict"]').text()).toBe('Verified')
    expect(wrapper.find('[data-testid="node-select"] button').text()).toContain('seed-a')
  })

  it('shows the views as tabs, with the entries first and the head one tab away', async () => {
    const wrapper = await verify('http://node:8080')
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['Head', 'Browse', 'Search', 'Identity', 'Live'])
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Browse')
    expect(wrapper.find('[data-testid="header-verdict"]').text()).toBe('Verified')
  })

  it('applies the header shard to the views', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await verify('http://node:8080')
    const field = wrapper.find('[data-testid="shard-form"] input')
    await field.setValue('other')
    await wrapper.find('[data-testid="shard-form"]').trigger('submit')
    await flushPromises()
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls.some((u) => u.includes('shard_id=other'))).toBe(true)
    vi.unstubAllGlobals()
  })

  it('explains what to do before a network is chosen, then shows the summary instead', async () => {
    const wrapper = mount(Home)
    await flushPromises()
    expect(wrapper.find('[data-testid="welcome"]').text()).toContain('Choose a network')
    await pickNetwork(wrapper)
    await flushPromises()
    expect(wrapper.find('[data-testid="welcome"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="head-summary"]').text()).toContain('Signed by the network and witnessed')
  })

  it('jumps to the checks from the summary', async () => {
    const wrapper = await verify('http://node:8080')
    await wrapper.findAll('button').find((b) => b.text() === 'See the checks')?.trigger('click')
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Head')
  })

  it('filters the networks as you type and lets you switch node from a dropdown', async () => {
    discoverAmong.mockResolvedValue({ serverUrl: 'http://seed-a', entry: anchor, verified: [{ serverUrl: 'http://seed-a', latencyMs: 3 }, { serverUrl: 'http://seed-b', latencyMs: 9 }] })
    fetchTrustAnchors.mockResolvedValue([anchor, { ...anchor, network_id: 'other-net', label: 'other' }])
    const wrapper = mount(Home)
    await flushPromises()
    await wrapper.find('[data-testid="network-select"] button').trigger('click')
    expect(wrapper.findAll('[data-testid="network-select"] [role="option"]')).toHaveLength(2)
    await wrapper.find('[data-testid="network-select"] input').setValue('other')
    expect(wrapper.findAll('[data-testid="network-select"] [role="option"]').map((o) => o.text())).toEqual([expect.stringContaining('other-net')])
    await wrapper.find('[data-testid="network-select"] input').setValue('')
    await wrapper.find('[data-testid="network-select"] [role="option"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="node-select"] button').trigger('click')
    expect(wrapper.findAll('[data-testid="node-select"] [role="option"]')).toHaveLength(2)
    await wrapper.findAll('[data-testid="node-select"] [role="option"]')[1].trigger('click')
    await flushPromises()
    expect(getCosignedTreeHead).toHaveBeenCalledWith('http://seed-b', {})
  })
})
