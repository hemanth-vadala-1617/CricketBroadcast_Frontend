import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Table, Td, Th } from './ui'

describe('Table (phone cards)', () => {
  it('copies each column heading onto its cells as a label, for the stacked layout on small screens', () => {
    render(
      <Table head={<tr><Th>Team</Th><Th>Country</Th><Th className="text-right">Actions</Th></tr>}>
        <tr><Td>India</Td><Td>IN</Td><Td><button>Edit</button></Td></tr>
        <tr><Td>Australia</Td><Td>AU</Td><Td><button>Edit</button></Td></tr>
      </Table>,
    )
    const cells = screen.getAllByRole('cell')
    expect(cells.map((c) => c.getAttribute('data-label'))).toEqual(['Team', 'Country', 'Actions', 'Team', 'Country', 'Actions'])
    expect(screen.getByRole('table')).toHaveClass('stack-table')
  })
})
