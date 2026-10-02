import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import LiveFeed from '../src/components/LiveFeed.vue'
import { entries } from './fixtures/entries'
import { head } from './fixtures/heads'

async function started(rows = entries(3, 8)) {
  const stopper = vi.fn()
  const deps = {
    client: { listEntries: vi.fn().mockResolvedValue(rows) },
    verifyHead: vi.fn().mockResolvedValue({ nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [], head: head({ tree_size: 10 }) }),
    every: vi.fn(() => stopper),
  }
  const wrapper = mount(LiveFeed, { props: { nodeUrl: 'http://node', deps } })
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return { wrapper, stopper }
}

describe('LiveFeed', () => {
  it('shows nothing until started', () => {
    const wrapper = mount(LiveFeed, { props: { nodeUrl: 'http://node' } })
    expect(wrapper.find('[data-testid="feed-state"]').exists()).toBe(false)
  })

  it('lists entries with the head verdict and the not-proven note', async () => {
    const { wrapper } = await started()
    expect(wrapper.findAll('[data-testid="feed-entry"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="feed-verdict"]').text()).toBe('Verified')
    expect(wrapper.text()).toContain('Listed, not individually proven')
  })

  it('pauses and stops polling when removed', async () => {
    const { wrapper, stopper } = await started()
    const pause = wrapper.findAll('button').find((b) => b.text() === 'Pause')
    await pause?.trigger('click')
    expect(stopper).toHaveBeenCalled()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Resume')).toBe(true)
  })

  it('stops polling on unmount', async () => {
    const { wrapper, stopper } = await started()
    wrapper.unmount()
    expect(stopper).toHaveBeenCalled()
  })

  it('opens an entry in a drawer with its full detail, and closes it', async () => {
    const { wrapper } = await started()
    expect(wrapper.find('[data-testid="feed-drawer"]').exists()).toBe(false)
    await wrapper.findAll('[data-testid="feed-open"]')[0].trigger('click')
    const drawer = wrapper.find('[data-testid="feed-drawer"]')
    expect(drawer.text()).toContain('Entry 10')
    expect(drawer.find('[data-testid="entry-payload"]').text()).toContain('credential_id')
    expect(drawer.find('[data-testid="entry-meaning"]').text()).toContain('passkey')
    await drawer.find('button[aria-label="Close entry"]').trigger('click')
    expect(wrapper.find('[data-testid="feed-drawer"]').exists()).toBe(false)
  })

  it('asks to open the inspected entry in the chain view', async () => {
    const { wrapper } = await started()
    await wrapper.findAll('[data-testid="feed-open"]')[0].trigger('click')
    await wrapper.find('[data-testid="feed-open-chain"]').trigger('click')
    expect(wrapper.emitted('open-entry')?.[0]).toEqual([{ shardId: 'core', seq: 10 }])
  })
})
