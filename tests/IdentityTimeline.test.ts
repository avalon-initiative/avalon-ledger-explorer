import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { EntriesClient } from '../src/api/entries'
import IdentityTimeline from '../src/components/IdentityTimeline.vue'
import { entries } from './fixtures/entries'

const ID = 'aeffc91b-0000-4000-8000-000000000001'

async function search(rows = [...entries(2), ...entries(1, 3, 'identity.created')]) {
  const listEntries = vi.fn<EntriesClient['listEntries']>().mockResolvedValue(rows)
  const wrapper = mount(IdentityTimeline, { props: { nodeUrl: 'http://node', client: { listEntries } } })
  await wrapper.find('input').setValue(ID)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

describe('IdentityTimeline', () => {
  it('groups the identity\'s entries by kind and states the scan outcome', async () => {
    const wrapper = await search()
    expect(wrapper.findAll('[data-testid="timeline-group"]').map((g) => g.find('h3').text())).toEqual(['identity.created (1)', 'identity.passkey_registered (2)'])
    expect(wrapper.find('[data-testid="scan-status"]').text()).toContain('3 entries for this identity in 3 scanned')
  })

  it('says so when nothing names the identity', async () => {
    const wrapper = await search([])
    expect(wrapper.find('[data-testid="timeline-empty"]').exists()).toBe(true)
  })

  it('emits the shard and seq of an entry to open', async () => {
    const wrapper = await search()
    await wrapper.findAll('[data-testid="timeline-open"]')[1].trigger('click')
    expect(wrapper.emitted('open')?.[0]).toEqual([{ shardId: 'core', seq: 1 }])
  })

  it('shows an error for a malformed id', async () => {
    const wrapper = mount(IdentityTimeline, { props: { nodeUrl: 'http://node', client: { listEntries: vi.fn() } } })
    await wrapper.find('input').setValue('nope')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Enter an identity id')
  })
})
