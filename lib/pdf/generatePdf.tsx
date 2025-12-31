import 'server-only';

import React from 'react';
import { pdf, Document, Page, Text, View, Link, StyleSheet } from '@react-pdf/renderer';
import type { CustomizationSnapshot } from '@/lib/customization/types';
import { env } from '@/env';

type ResultsDTO = {
  token: string;
  created_at: string;
  company?: string | null;
  overall: {
    score: number;
    score_capped: number;
    level: { level: number; name: string; hero_title: string; hero_copy: string; color_token: string };
  };
  dimensions: Array<{
    dimension_id: string;
    section: string;
    short_label: string;
    name: string;
    score: number;
    tier: 'low' | 'medium' | 'high';
    is_primary_gap: boolean;
    is_critical_gap: boolean;
  }>;
  roadmap: Array<{
    dimension_id: string;
    tier: 'low' | 'medium' | 'high';
    what_it_means: string;
    now: string[];
    next: string[];
    later: string[];
    success_indicator: string;
  }>;
  primary_gap: { dimension_id: string; score: number };
  cta: { intensity: 'hot' | 'warm' | 'cool'; reason_codes: string[] };
};

const THEME = {
  bg: '#0a0a0a',
  border: '#222222',
  fg: '#ffffff',
  muted: '#a1a1aa',
  level: {
    1: '#ef4444',
    2: '#f97316',
    3: '#eab308',
    4: '#22c55e',
    5: '#3b82f6',
  } as Record<number, string>,
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: THEME.bg,
    color: THEME.fg,
    padding: 32,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  h1: {
    fontSize: 20,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    marginTop: 18,
    marginBottom: 8,
  },
  muted: {
    color: THEME.muted,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    border: `1px solid ${THEME.border}`,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  bullet: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.muted}>{n}</Text>
      <Text style={styles.muted}>{title} →</Text>
    </View>
  );
}

function Pill({ level, children }: { level: number; children: React.ReactNode }) {
  return (
    <Text
      style={{
        border: `1px solid ${THEME.border}`,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        color: THEME.level[level] ?? THEME.fg,
      }}
    >
      {children}
    </Text>
  );
}

export async function generatePdf(args: {
  results: ResultsDTO;
  customization?: CustomizationSnapshot | null;
  baseUrl?: string;
}): Promise<Buffer> {
  const { results, customization } = args;
  const baseUrl = args.baseUrl ?? env.NEXT_PUBLIC_SITE_URL ?? '';

  const levelColor = THEME.level[results.overall.level.level] ?? THEME.fg;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.muted}>MaxMin — DTC Analytics Maturity Assessment</Text>
          <Text style={styles.h1}>{results.overall.level.hero_title || 'Your maturity snapshot'}</Text>
          <Text style={{ color: levelColor, marginBottom: 6 }}>{results.overall.level.name}</Text>
          {results.company && <Text style={{ marginBottom: 4 }}>{results.company}</Text>}
          <Text style={styles.muted}>
            Generated {new Date(results.created_at).toLocaleDateString()} • Token {results.token}
          </Text>
        </View>

        {/* 01 Summary */}
        <View style={styles.card}>
          <SectionLabel n="01" title="Summary" />
          <View style={styles.row}>
            <Pill level={results.overall.level.level}>
              Level {results.overall.level.level} • {results.overall.level.name}
            </Pill>
            <Text style={styles.muted}>Score {results.overall.score_capped.toFixed(1)}/5</Text>
          </View>
          {results.overall.level.hero_copy && (
            <Text style={{ marginTop: 8 }}>{results.overall.level.hero_copy}</Text>
          )}
          <Text style={{ marginTop: 8 }}>
            <Text style={styles.muted}>Primary gap:</Text>{' '}
            {results.dimensions.find((d) => d.dimension_id === results.primary_gap.dimension_id)?.name ??
              results.primary_gap.dimension_id}{' '}
            →
          </Text>
        </View>

        {/* 02 Breakdown */}
        <View style={styles.card}>
          <SectionLabel n="02" title="Breakdown" />
          {results.dimensions.map((d) => (
            <View
              key={d.dimension_id}
              style={{ marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <Text>
                {d.section} {d.name}{' '}
                {d.is_primary_gap && <Text style={{ color: levelColor }}>• primary</Text>}
                {d.is_critical_gap && <Text style={{ color: THEME.level[1] }}> • critical</Text>}
              </Text>
              <Text style={styles.muted}>
                {d.score.toFixed(1)} • {d.tier}
              </Text>
            </View>
          ))}
        </View>

        {/* 03 Roadmap */}
        <View style={styles.card}>
          <SectionLabel n="03" title="Roadmap (Top 3)" />
          {results.roadmap.map((m, idx) => (
            <View key={`${m.dimension_id}-${m.tier}-${idx}`} style={{ marginBottom: 10 }}>
              <Text style={{ marginBottom: 4 }}>
                <Text style={styles.muted}>Module:</Text>{' '}
                {results.dimensions.find((d) => d.dimension_id === m.dimension_id)?.name ?? m.dimension_id} •{' '}
                {m.tier}
              </Text>
              <Text style={styles.muted}>{m.what_it_means}</Text>

              <Text style={{ marginTop: 6 }}>Now</Text>
              {m.now.slice(0, 4).map((b, i) => (
                <View key={`now-${i}`} style={styles.bullet}>
                  <Text style={styles.muted}>•</Text>
                  <Text>{b}</Text>
                </View>
              ))}

              <Text style={{ marginTop: 6 }}>Next</Text>
              {m.next.slice(0, 4).map((b, i) => (
                <View key={`next-${i}`} style={styles.bullet}>
                  <Text style={styles.muted}>•</Text>
                  <Text>{b}</Text>
                </View>
              ))}

              <Text style={{ marginTop: 6 }}>Later</Text>
              {m.later.slice(0, 4).map((b, i) => (
                <View key={`later-${i}`} style={styles.bullet}>
                  <Text style={styles.muted}>•</Text>
                  <Text>{b}</Text>
                </View>
              ))}

              <Text style={{ marginTop: 6 }}>
                <Text style={styles.muted}>Success:</Text> {m.success_indicator}
              </Text>
            </View>
          ))}
        </View>

        {/* 04 Dependencies */}
        {customization?.dependency_alerts?.length ? (
          <View style={styles.card}>
            <SectionLabel n="04" title="Dependencies" />
            {customization.dependency_alerts.map((a) => (
              <View key={a.id} style={{ marginBottom: 10 }}>
                <Text style={{ marginBottom: 3 }}>
                  <Text
                    style={{
                      color:
                        a.severity === 'critical'
                          ? THEME.level[1]
                          : a.severity === 'warning'
                            ? THEME.level[2]
                            : THEME.muted,
                    }}
                  >
                    {a.severity.toUpperCase()}
                  </Text>{' '}
                  {a.title}
                </Text>
                <Text style={styles.muted}>{a.message}</Text>
                <Text style={{ marginTop: 4 }}>
                  <Text style={styles.muted}>Recommendation:</Text> {a.recommendation}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 05 Impact */}
        {customization?.impacts?.length ? (
          <View style={styles.card}>
            <SectionLabel n="05" title="Impact" />
            {customization.impacts.map((x) => (
              <View key={`${x.dimension_id}-${x.tier}`} style={{ marginBottom: 12 }}>
                <Text style={{ marginBottom: 2 }}>
                  {results.dimensions.find((d) => d.dimension_id === x.dimension_id)?.name ?? x.dimension_id} •{' '}
                  {x.tier}
                </Text>
                <Text style={{ color: levelColor, marginBottom: 3 }}>
                  {x.metric_value} {x.metric_label}
                </Text>
                <Text style={styles.muted}>{x.detail}</Text>
                {x.business_impact?.slice(0, 4).map((b, i) => (
                  <View key={`bi-${i}`} style={styles.bullet}>
                    <Text style={styles.muted}>•</Text>
                    <Text>{b}</Text>
                  </View>
                ))}
                {x.cost_example && (
                  <Text style={{ marginTop: 4 }}>
                    <Text style={styles.muted}>Example:</Text> {x.cost_example}
                  </Text>
                )}
                {x.opportunity && (
                  <Text style={{ marginTop: 2 }}>
                    <Text style={styles.muted}>Opportunity:</Text> {x.opportunity}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {/* 06 Tools */}
        {customization?.tools?.length ? (
          <View style={styles.card}>
            <SectionLabel n="06" title="Tools" />
            {customization.tools.map((t) => (
              <View key={`${t.dimension_id}-${t.tier}`} style={{ marginBottom: 12 }}>
                <Text style={{ marginBottom: 2 }}>
                  {results.dimensions.find((d) => d.dimension_id === t.dimension_id)?.name ?? t.dimension_id} •{' '}
                  {t.tier}
                </Text>
                <Text style={styles.muted}>{t.context}</Text>

                {t.quick_wins?.length ? (
                  <>
                    <Text style={{ marginTop: 6 }}>Quick wins</Text>
                    {t.quick_wins.slice(0, 5).map((b, i) => (
                      <View key={`qw-${i}`} style={styles.bullet}>
                        <Text style={styles.muted}>•</Text>
                        <Text>{b}</Text>
                      </View>
                    ))}
                  </>
                ) : null}

                {t.recommended_tools?.length ? (
                  <>
                    <Text style={{ marginTop: 6 }}>Recommended tools</Text>
                    {t.recommended_tools.slice(0, 6).map((tool, i) => (
                      <View key={`tool-${i}`} style={{ marginBottom: 4 }}>
                        <Text>
                          <Text style={{ color: levelColor }}>{tool.name}</Text>{' '}
                          <Text style={styles.muted}>
                            ({tool.category} • {tool.price})
                          </Text>
                        </Text>
                        <Text style={styles.muted}>{tool.fit}</Text>
                        {tool.url && (
                          <Link src={tool.url} style={{ color: THEME.muted }}>
                            {tool.url}
                          </Link>
                        )}
                        {tool.note && <Text style={styles.muted}>{tool.note}</Text>}
                      </View>
                    ))}
                  </>
                ) : null}

                {t.diy_alternative && (
                  <Text style={{ marginTop: 6 }}>
                    <Text style={styles.muted}>DIY alternative:</Text> {t.diy_alternative}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {/* 07 Benchmarks */}
        {customization?.benchmarks?.length ? (
          <View style={styles.card}>
            <SectionLabel n="07" title="Next Level Benchmarks" />
            {customization.benchmarks.map((b) => (
              <View key={`${b.dimension_id}-${b.from_level}-${b.to_level}`} style={{ marginBottom: 10 }}>
                <Text style={{ marginBottom: 3 }}>
                  {results.dimensions.find((d) => d.dimension_id === b.dimension_id)?.name ?? b.dimension_id}:{' '}
                  Level {b.from_level} → {b.to_level}
                </Text>
                <Text style={styles.muted}>{b.gap_summary}</Text>

                <Text style={{ marginTop: 6 }}>Current</Text>
                {b.current_state.slice(0, 5).map((x, i) => (
                  <View key={`cs-${i}`} style={styles.bullet}>
                    <Text style={styles.muted}>•</Text>
                    <Text>{x}</Text>
                  </View>
                ))}

                <Text style={{ marginTop: 6 }}>Target</Text>
                {b.target_state.slice(0, 5).map((x, i) => (
                  <View key={`ts-${i}`} style={styles.bullet}>
                    <Text style={styles.muted}>•</Text>
                    <Text>{x}</Text>
                  </View>
                ))}

                <Text style={{ marginTop: 6 }}>
                  <Text style={styles.muted}>Success indicator:</Text> {b.success_indicator}
                </Text>
                <Text>
                  <Text style={styles.muted}>Typical timeline:</Text> {b.typical_timeline}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Footer */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.muted}>Generated by MaxMin</Text>
          {baseUrl && (
            <Text style={styles.muted}>
              View online:{' '}
              <Link src={`${baseUrl}/results/${results.token}`} style={{ color: THEME.muted }}>
                {`${baseUrl}/results/${results.token}`}
              </Link>
            </Text>
          )}
        </View>
      </Page>
    </Document>
  );

  const instance = pdf(doc);
  const stream = await instance.toBuffer();

  // Handle different return types from @react-pdf/renderer
  if (Buffer.isBuffer(stream)) {
    return stream;
  }

  // If it's a Node.js readable stream
  if (stream && typeof (stream as any).pipe === 'function') {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const nodeStream = stream as NodeJS.ReadableStream;
      nodeStream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      nodeStream.on('end', () => resolve(Buffer.concat(chunks)));
      nodeStream.on('error', reject);
    });
  }

  // If it's array-like (Uint8Array or similar)
  if (stream && typeof (stream as any).length === 'number') {
    return Buffer.from(stream as unknown as ArrayBuffer);
  }

  throw new Error('Unexpected return type from pdf().toBuffer()');
}

// Legacy export for backward compatibility (without customization)
export async function generatePdfLegacy(dto: ResultsDTO): Promise<Uint8Array> {
  const buf = await generatePdf({ results: dto });
  return new Uint8Array(buf);
}
