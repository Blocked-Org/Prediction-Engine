import { render } from '@testing-library/react'
import { SaturationCurveChart } from '../SaturationCurveChart'

// Mock lightweight-charts to avoid canvas/window issues in JSDOM
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn(() => ({
    addSeries: jest.fn(() => ({
      setData: jest.fn(),
    })),
    applyOptions: jest.fn(),
    remove: jest.fn(),
  })),
  ColorType: { Solid: 'solid' },
  LineSeries: 'LineSeries'
}), { virtual: true })

describe('SaturationCurveChart', () => {
  it('renders the chart container without crashing', () => {
    const { container } = render(
      <SaturationCurveChart maxSpend={5000} estimatedRevenue={10000} />
    )
    
    // The component should render a div that acts as the container for the chart
    expect(container.firstChild).toBeInTheDocument()
  })
})
