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

  // Colors - using resolved values for SVG/Recharts compatibility
  // Matches theme: accent=#C54B4B, muted=#8A8A8A, fg=#1A1A1A, rule=rgba(0,0,0,0.08)
  const stroke = '#C54B4B';
  const fill = 'rgba(197, 75, 75, 0.18)';  // accent at 18% opacity
  const grid = 'rgba(0, 0, 0, 0.08)';
  const tick = '#8A8A8A';
  const text = '#1A1A1A';

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
            background: '#F5F2EB',  // matches --bg
            border: '1px solid rgba(0, 0, 0, 0.08)',  // matches --rule
            borderRadius: 0,  // sharp corners to match theme
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
