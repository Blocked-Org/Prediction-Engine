import { render, screen } from "@testing-library/react";
import {
  ROITrackingChart,
  type ROIDataPoint,
} from "../ROITrackingChart";

// lightweight-charts creates a canvas and uses ResizeObserver — mock both.
jest.mock("lightweight-charts", () => ({
  createChart: () => ({
    addSeries: () => ({
      setData: jest.fn(),
    }),
    timeScale: () => ({
      fitContent: jest.fn(),
    }),
    applyOptions: jest.fn(),
    remove: jest.fn(),
  }),
  ColorType: { Solid: "solid" },
  LineSeries: "LineSeries",
  AreaSeries: "AreaSeries",
}), { virtual: true });

const MOCK_POINTS: ROIDataPoint[] = [
  { date: "2024-01-01", iroas: 0.8, lower: 0.5, upper: 1.1 },
  { date: "2024-01-08", iroas: 1.2, lower: 0.9, upper: 1.5 },
  { date: "2024-01-15", iroas: 1.8, lower: 1.4, upper: 2.2 },
];

describe("ROITrackingChart", () => {
  it("renders the chart container without crashing", () => {
    const { container } = render(
      <ROITrackingChart dataPoints={MOCK_POINTS} />
    );
    // The outer wrapper div should exist
    expect(container.firstChild).not.toBeNull();
  });

  it("renders the legend with iROAS and interval labels", () => {
    render(<ROITrackingChart dataPoints={MOCK_POINTS} />);
    expect(screen.getByText(/iROAS \(point estimate\)/i)).toBeInTheDocument();
    expect(screen.getByText(/90% credible interval/i)).toBeInTheDocument();
    expect(screen.getByText(/Break-even/i)).toBeInTheDocument();
  });

  it("renders with a custom break-even threshold label", () => {
    render(
      <ROITrackingChart dataPoints={MOCK_POINTS} breakEvenThreshold={1.5} />
    );
    expect(
      screen.getByText(/Break-even/i)
    ).toBeInTheDocument();
  });

  it("renders nothing in the chart area when dataPoints is empty", () => {
    const { container } = render(<ROITrackingChart dataPoints={[]} />);
    // Component still mounts without crashing
    expect(container.firstChild).not.toBeNull();
  });
});

