import React from 'react'
import { render, screen } from '@testing-library/react'
import { DataTable } from '../DataTable'
import { ColumnDef } from '@tanstack/react-table'

type TestData = { id: string; amount: number }

const columns: ColumnDef<TestData>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'amount', header: 'Amount' },
]

describe('DataTable Component', () => {
  it('renders columns and data correctly', () => {
    const data: TestData[] = [
      { id: '1', amount: 100 },
      { id: '2', amount: 200 },
    ]

    render(<DataTable columns={columns} data={data} />)

    // Check headers
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()

    // Check data cells
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('renders "No results." when data is empty', () => {
    render(<DataTable columns={columns} data={[]} />)
    
    expect(screen.getByText('No results.')).toBeInTheDocument()
  })
})
