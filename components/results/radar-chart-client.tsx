'use client';

import * as React from 'react';
import type { ResultsDTO } from '@/lib/results/types';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export default function RadarChartClient({ dto }: { dto: ResultsDTO }) {
  const data = dto.dimensions
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((d) => ({
      key: d.short_label,
      score: d.score,
      name: d.name,
    }));

  // Token-only colors (no hex)
  const stroke = 'hsl(var(--accent))';
  const fill = 'hsl(var(--accent) / 0.18)';
  const grid = 'hsl(var(--border))';
  const tick = 'hsl(var(--muted))';
  const text = 'hsl(var(--fg))';

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={grid} />
        <PolarAngleAxis dataKey="key" tick={{ fill: tick, fontSize: 12 }} />
        <PolarRadiusAxis
          domain={[1, 5]}
          tick={{ fill: tick, fontSize: 11 }}
          tickCount={5}
          axisLine={{ stroke: grid }}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--surface))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 12,
            color: text,
          }}
          labelStyle={{ color: text }}
          formatter={(value: any, _name: any, props: any) => {
            const v = typeof value === 'number' ? value.toFixed(2) : String(value);
            return [`${v}`, props?.payload?.name ?? ''];
          }}
        />
        <Radar dataKey="score" stroke={stroke} fill={fill} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
