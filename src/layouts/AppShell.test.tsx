import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../store/useAuthStore'
import AppShell from './AppShell'

beforeEach(() => { useAuthStore.setState({ user: { userId: 'u1', email: 'admin@x.com', roles: ['Admin'] } as never }) })

const shell = () => render(
  <MemoryRouter initialEntries={['/admin']}>
    <Routes><Route path="/admin" element={<AppShell />}><Route index element={<p>Dashboard page</p>} /><Route path="teams" element={<p>Teams page</p>} /></Route></Routes>
  </MemoryRouter>,
)

describe('AppShell on a phone', () => {
  it('has a menu button that opens a drawer with the same links, and closes it again', async () => {
    shell()
    expect(screen.queryByTestId('mobile-menu')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = screen.getByTestId('mobile-menu')
    expect(drawer).toHaveTextContent('Matches')
    expect(drawer).toHaveTextContent('Match rules')
    expect(drawer).toHaveTextContent('admin@x.com')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByTestId('mobile-menu')).toBeNull()
  })

  it('closes the drawer when a page is chosen', async () => {
    shell()
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const links = screen.getAllByRole('link', { name: 'Teams' })
    await userEvent.click(links[0]!)
    expect(await screen.findByText('Teams page')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-menu')).toBeNull()
  })
})
