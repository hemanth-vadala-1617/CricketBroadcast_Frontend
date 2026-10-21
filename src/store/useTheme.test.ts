import { beforeEach, describe, expect, it } from 'vitest'
import { THEME_KEY, applyTheme, resolveDark, useTheme } from './useTheme'

beforeEach(() => { localStorage.clear(); document.documentElement.className = ''; useTheme.setState({ mode: 'system' }) })

describe('theme', () => {
  it('is dark when chosen, or when "system" and the device is dark, and never on the OBS overlay', () => {
    expect(resolveDark('dark', false, '/admin')).toBe(true)
    expect(resolveDark('light', true, '/admin')).toBe(false)
    expect(resolveDark('system', true, '/admin')).toBe(true)
    expect(resolveDark('system', false, '/admin')).toBe(false)
    expect(resolveDark('dark', true, '/overlay/abc')).toBe(false)
  })

  it('puts the dark class on <html> and takes it off again', () => {
    applyTheme('dark', '/admin')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light', '/admin')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    applyTheme('dark', '/overlay/abc')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('remembers the choice and cycles light, dark, auto', () => {
    useTheme.getState().setMode('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    useTheme.getState().cycle()
    expect(useTheme.getState().mode).toBe('system')
    useTheme.getState().cycle()
    expect(useTheme.getState().mode).toBe('light')
    useTheme.getState().cycle()
    expect(useTheme.getState().mode).toBe('dark')
  })
})
