import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { EntriesClient } from '../src/api/entries'
import NameSearch from '../src/components/NameSearch.vue'
import { createdEntry, entries } from './fixtures/entries'

async function search(rows = [createdEntry(1, 'id-a', 'Alice'), createdEntry(2, 'id-b', 'alice'), ...entries(1, 3)], query = 'alice') {
  const listEntries = vi.fn<EntriesClient['listEntries']>().mockResolvedValue(rows)
  const wrapper = mount(NameSearch, { props: { nodeUrl: 'http://node', client: { listEntries } } })
  await wrapper.find('input').setValue(query)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

describe('NameSearch', () => {
  it('shows both entries that share a name instead of hiding one', async () => {
    const wrapper = await search()
    expect(wrapper.findAll('[data-testid="name-candidate"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="name-duplicate"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="name-status"]').text()).toContain('2 candidates for "alice" in 3 scanned')
  })

  it('says so when nothing matches', async () => {
    const wrapper = await search(undefined, 'zed')
    expect(wrapper.find('[data-testid="name-status"]').text()).toContain('0 candidates')
    expect(wrapper.find('[data-testid="name-candidate"]').exists()).toBe(false)
  })

  it('emits the identity to show a timeline for', async () => {
    const wrapper = await search()
    await wrapper.find('[data-testid="name-timeline"]').trigger('click')
    expect(wrapper.emitted('timeline')?.[0]).toEqual(['id-a'])
  })

  it('refuses an empty query', async () => {
    const wrapper = await search(undefined, ' ')
    expect(wrapper.text()).toContain('Enter part of a display name')
  })
})
