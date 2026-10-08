import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, ChartFrame, legendProps, SERIES, tooltipProps } from './ChartFrame'

interface Props {
  title: string
  data: Array<Record<string, string | number>>
  xKey: string
  xLabel: string
  series: Array<{ key: string; label: string }>
  height?: number
}

/** 2px lines, ≥8px markers ringed with the surface, crosshair tooltip, one y-axis. */
export function TrendChart({ title, data, xKey, xLabel, series, height = 280 }: Props) {
  return (
    <ChartFrame title={title} columns={[{ key: xKey, label: xLabel }, ...series.map((s) => ({ key: s.key, label: s.label }))]} rows={data}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis allowDecimals={false} {...axisProps} />
          <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--chart-text)', strokeWidth: 1 }} />
          {series.length > 1 && <Legend {...legendProps} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stroke={SERIES[i % SERIES.length]}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)', fill: SERIES[i % SERIES.length] }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--chart-surface)' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
