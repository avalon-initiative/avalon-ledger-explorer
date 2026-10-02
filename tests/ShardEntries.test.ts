import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { EntriesError } from '../src/api/entries'
import type { EntriesClient } from '../src/api/entries'
import ShardEntries from '../src/components/ShardEntries.vue'
import type { SthReport } from '../src/utils/sthReport'
import { entries } from './fixtures/entries'

const report: SthReport = { nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [] }

async function view(listEntries: EntriesClient['listEntries'], verified = true) {
  const verifyHead = vi.fn().mockResolvedValue({ ...report, verified })
  const wrapper = mount(ShardEntries, { props: { nodeUrl: 'http://node', deps: { client: { listEntries }, verifyHead } } })
  await flushPromises()
  return wrapper
}

describe('ShardEntries', () => {
  it('lists rows with the head verdict, the not-proven label and chain continuity', async () => {
    const wrapper = await view(vi.fn<EntriesClient['listEntries']>().mockResolvedValue(entries(3)))
    expect(wrapper.findAll('[data-testid="entry-row"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="entry-row"]').text()).toContain('identity.passkey_registered')
    expect(wrapper.find('[data-testid="shard-verdict"]').text()).toBe('Verified')
    expect(wrapper.find('[data-testid="not-proven"]').text()).toContain('Listed, not individually proven')
    expect(wrapper.find('[data-testid="continuity"]').text()).toContain('linked across 3 entries')
  })

  it('shows a failed head next to the entries', async () => {
    const wrapper = await view(vi.fn<EntriesClient['listEntries']>().mockResolvedValue(entries(1)), false)
    expect(wrapper.find('[data-testid="shard-verdict"]').text()).toBe('Not verified')
  })

  it('expands a payload as pretty JSON and collapses it', async () => {
    const wrapper = await view(vi.fn<EntriesClient['listEntries']>().mockResolvedValue(entries(2)))
    await wrapper.find('[data-testid="entry-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="entry-payload"]').text()).toContain('"credential_id": "cred-1"')
    await wrapper.find('[data-testid="entry-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="entry-payload"]').exists()).toBe(false)
  })

  it('says when a payload was pruned', async () => {
    const page = [{ ...entries(1)[0], payload: null, payload_pruned: true }]
    const wrapper = await view(vi.fn<EntriesClient['listEntries']>().mockResolvedValue(page))
    await wrapper.find('[data-testid="entry-toggle"]').trigger('click')
    expect(wrapper.find('[data-testid="entry-payload"]').text()).toBe('Payload pruned by this node.')
  })

  it('explains an empty shard', async () => {
    const wrapper = await view(vi.fn<EntriesClient['listEntries']>().mockResolvedValue([]))
    expect(wrapper.find('[data-testid="empty"]').text()).toContain('shard core is empty')
  })

  it('shows a network error and a shard the node does not serve', async () => {
    const down = await view(vi.fn<EntriesClient['listEntries']>().mockRejectedValue(new EntriesError('Could not reach the node: Failed to fetch')))
    expect(down.text()).toContain('Could not reach the node: Failed to fetch')
    const missing = await view(vi.fn<EntriesClient['listEntries']>().mockRejectedValue(new EntriesError('This node does not serve shard core.', 404)))
    expect(missing.text()).toContain('This node does not serve shard core.')
  })

  it('loads the next page from the last seq', async () => {
    const listEntries = vi.fn<EntriesClient['listEntries']>().mockResolvedValueOnce(entries(50)).mockResolvedValueOnce(entries(1, 51))
    const wrapper = await view(listEntries)
    const next = wrapper.findAll('button').find((b) => b.text() === 'Next')!
    await next.trigger('click')
    await flushPromises()
    expect(listEntries.mock.calls[1][1].sinceSeq).toBe(50)
    expect(wrapper.findAll('[data-testid="entry-row"]')).toHaveLength(1)
  })
})
