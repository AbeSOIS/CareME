import { Bar, BarChart as RBarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, ChartFrame, legendProps, SERIES, tooltipProps } from './ChartFrame'

export interface BarSeries {
  key: string
  label: string
}

interface Props {
  title: string
  data: Array<Record<string, string | number>>
  /** Category axis field. */
  xKey: string
  xLabel: string
  series: BarSeries[]
  stacked?: boolean
  layout?: 'horizontal' | 'vertical'
  height?: number
}

/**
 * Thin bars, 4px rounded data-ends, a 2px surface gap between stacked segments,
 * one value axis, legend for ≥2 series, hover tooltip and a table view.
 */
export function BarChart({ title, data, xKey, xLabel, series, stacked, layout = 'horizontal', height = 300 }: Props) {
  const vertical = layout === 'vertical'
  return (
    <ChartFrame title={title} columns={[{ key: xKey, label: xLabel }, ...series.map((s) => ({ key: s.key, label: s.label }))]} rows={data}>
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 8, bottom: 4, left: vertical ? 8 : -12 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="0" vertical={vertical} horizontal={!vertical} />
          {vertical ? (
            <>
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey={xKey} width={110} {...axisProps} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} interval={0} {...axisProps} height={50} angle={data.length > 6 ? -30 : 0} textAnchor={data.length > 6 ? 'end' : 'middle'} />
              <YAxis allowDecimals={false} {...axisProps} />
            </>
          )}
          <Tooltip {...tooltipProps} />
          {series.length > 1 && <Legend {...legendProps} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'a' : undefined}
              fill={SERIES[i % SERIES.length]}
              stroke="var(--chart-surface)"
              strokeWidth={stacked ? 2 : 0}
              radius={!stacked || i === series.length - 1 ? (vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0}
              maxBarSize={36}
            />
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
