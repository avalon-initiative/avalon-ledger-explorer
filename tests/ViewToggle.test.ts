import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ViewToggle from '../src/components/ViewToggle.vue'

describe('ViewToggle', () => {
  it('emits the other view when it is clicked', async () => {
    const wrapper = mount(ViewToggle, { props: { view: 'chain' } })
    await wrapper.find('[data-testid="view-list"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['list'])
  })
})
