import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { LedgerEntry } from '../src/api/entries'
import BrowsePanel from '../src/components/BrowsePanel.vue'
import ChainView from '../src/components/ChainView.vue'
import { entries } from './fixtures/entries'
import { head } from './fixtures/heads'

function deps(size = 10) {
  const all = entries(size)
  return {
    client: { listEntries: vi.fn(async (_u: string, q: { sinceSeq: number; limit: number }): Promise<LedgerEntry[]> => all.filter((e) => e.seq > q.sinceSeq).slice(0, q.limit)) },
    verifyHead: vi.fn().mockResolvedValue({ nodeUrl: 'http://node', anchorSource: 'a', verified: true, checks: [], head: head({ tree_size: size }) }),
  }
}

async function view(size = 10) {
  const wrapper = mount(ChainView, { props: { nodeUrl: 'http://node', deps: deps(size) } })
  await flushPromises()
  return wrapper
}

describe('ChainView', () => {
  it('centers the latest entry with its previous neighbour and a linked badge', async () => {
    const wrapper = await view()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 10')
    expect(wrapper.find('[data-testid="chain-prev"]').text()).toContain('seq 9')
    expect(wrapper.find('[data-testid="chain-next-none"]').text()).toBe('End of the chain')
    expect(wrapper.find('[data-testid="chain-link-before"]').text()).toContain('Linked')
    expect(wrapper.find('[data-testid="chain-position"]').text()).toContain('entry 10 of 10')
  })

  it('shows the payload and steps to the previous entry on click', async () => {
    const wrapper = await view()
    expect(wrapper.find('[data-testid="chain-payload"]').text()).toContain('credential_id')
    await wrapper.find('[data-testid="chain-prev"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 9')
    expect(wrapper.find('[data-testid="chain-next"]').text()).toContain('seq 10')
  })

  it('steps with the arrow keys but not while typing in a field', async () => {
    const wrapper = await view()
    await wrapper.find('[data-testid="chain-view"]').trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 9')
    await wrapper.find('input[type="text"]').trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 9')
  })

  it('jumps to a seq typed in', async () => {
    const wrapper = await view()
    await wrapper.find('input[type="text"]').setValue('3')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 3')
  })

  it('jumps from the slider', async () => {
    const wrapper = await view()
    const slider = wrapper.find('[data-testid="chain-slider"]')
    await slider.setValue('5')
    await slider.trigger('change')
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-current"]').text()).toContain('seq 5')
  })
})

describe('BrowsePanel', () => {
  it('starts on the chain view and switches to the list', async () => {
    const wrapper = mount(BrowsePanel, { props: { nodeUrl: 'http://node' }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('[data-testid="chain-view"]').isVisible()).toBe(true)
    await wrapper.find('[data-testid="view-list"]').trigger('click')
    expect(wrapper.find('[data-testid="shard-entries"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="chain-view"]').isVisible()).toBe(false)
    wrapper.unmount()
  })
})
