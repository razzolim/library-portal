import { describe, it, expect } from 'vitest'
import { mountWithI18n } from '../test-utils.js'
import PaginationControls from '../../../src/components/PaginationControls.vue'

describe('PaginationControls', () => {
  function mountPagination(props = {}) {
    return mountWithI18n(PaginationControls, {
      props: {
        modelValue: 12,
        currentPage: 1,
        totalItems: 24,
        ...props
      }
    })
  }

  it('renders items per page select', () => {
    const wrapper = mountPagination()
    expect(wrapper.find('select').exists()).toBe(true)
  })

  it('offers predefined page sizes', () => {
    const wrapper = mountPagination()
    const options = wrapper.findAll('select option')
    const values = options.map((option) => Number(option.element.value))

    expect(values).toEqual([6, 12, 24, 48])
  })

  it('disables previous button on first page', () => {
    const wrapper = mountPagination({ currentPage: 1, totalItems: 48 })
    const buttons = wrapper.findAll('button')
    const previousButton = buttons[0]

    expect(previousButton.attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
  })

  it('disables next button on last page', () => {
    const wrapper = mountPagination({ currentPage: 2, totalItems: 24, modelValue: 12 })
    const buttons = wrapper.findAll('button')
    const nextButton = buttons[1]

    expect(nextButton.attributes('disabled')).toBeDefined()
    expect(buttons[0].attributes('disabled')).toBeUndefined()
  })

  it('emits update:modelValue when changing items per page', async () => {
    const wrapper = mountPagination({ currentPage: 2, totalItems: 48, modelValue: 12 })
    const select = wrapper.find('select')

    await select.setValue('24')

    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([24])
  })

  it('resets current page to 1 when items per page changes', async () => {
    const wrapper = mountPagination({ currentPage: 2, totalItems: 48, modelValue: 12 })
    const select = wrapper.find('select')

    await select.setValue('24')

    expect(wrapper.emitted('update:currentPage')).toHaveLength(1)
    expect(wrapper.emitted('update:currentPage')[0]).toEqual([1])
  })

  it('emits update:currentPage when clicking next', async () => {
    const wrapper = mountPagination({ currentPage: 1, totalItems: 24, modelValue: 12 })
    const buttons = wrapper.findAll('button')

    await buttons[1].trigger('click')

    expect(wrapper.emitted('update:currentPage')).toHaveLength(1)
    expect(wrapper.emitted('update:currentPage')[0]).toEqual([2])
  })

  it('emits update:currentPage when clicking previous', async () => {
    const wrapper = mountPagination({ currentPage: 2, totalItems: 24, modelValue: 12 })
    const buttons = wrapper.findAll('button')

    await buttons[0].trigger('click')

    expect(wrapper.emitted('update:currentPage')).toHaveLength(1)
    expect(wrapper.emitted('update:currentPage')[0]).toEqual([1])
  })

  it('calculates total pages correctly', () => {
    const wrapper = mountPagination({ totalItems: 25, modelValue: 12 })

    expect(wrapper.text()).toContain('Page 1 of 3')
  })
})
