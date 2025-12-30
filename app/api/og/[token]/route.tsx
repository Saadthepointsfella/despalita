import { ImageResponse } from '@vercel/og';
import { getResultsDto } from '@/lib/assessment/getResultsDto';
import { isValidResultToken } from '@/lib/tokens/validate';
import { maxminTheme } from '@/lib/theme/maxminTheme';
import { clamp } from '@/lib/og/clamp';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token format
  if (!isValidResultToken(token)) {
    return new Response('Invalid token', { status: 400 });
  }

  // Fetch results
  const dto = await getResultsDto(token);
  if (!dto) {
    return new Response('Results not found', { status: 404 });
  }

  const levelNum = dto.overall.level.level;
  const levelInfo = maxminTheme.levelColors[levelNum] ?? {
    bg: maxminTheme.colors.surface,
    fg: maxminTheme.colors.fg,
    label: `Level ${levelNum}`,
  };

  // Dimension scores for mini bar chart
  const dims = dto.dimensions.slice(0, 6);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: maxminTheme.colors.bg,
          padding: 60,
          fontFamily: maxminTheme.fonts.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 24,
                color: maxminTheme.colors.muted,
                marginBottom: 8,
              }}
            >
              MaxMin DTC Assessment
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: maxminTheme.colors.fg,
                letterSpacing: '-0.02em',
              }}
            >
              {clamp(dto.company || 'Your Results', 30)}
            </div>
          </div>

          {/* Score badge */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: levelInfo.bg,
              padding: '24px 32px',
              borderRadius: 16,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: levelInfo.fg,
              }}
            >
              {dto.overall.score_capped.toFixed(1)}
            </div>
            <div
              style={{
                fontSize: 18,
                color: levelInfo.fg,
                opacity: 0.8,
              }}
            >
              {levelInfo.label}
            </div>
          </div>
        </div>

        {/* Dimension bars */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 48,
          }}
        >
          {dims.map((d) => {
            const pct = Math.min(100, Math.max(0, (d.score / 5) * 100));
            const tierColor = maxminTheme.tierColors[d.tier] ?? maxminTheme.tierColors.medium;

            return (
              <div
                key={d.dimension_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 140,
                    fontSize: 16,
                    color: maxminTheme.colors.muted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.short_label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 24,
                    backgroundColor: maxminTheme.colors.surface,
                    borderRadius: 4,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      backgroundColor: tierColor.fg,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 50,
                    fontSize: 16,
                    fontWeight: 600,
                    color: maxminTheme.colors.fg,
                    textAlign: 'right',
                  }}
                >
                  {d.score.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 'auto',
            paddingTop: 32,
            borderTop: `1px solid ${maxminTheme.colors.border}`,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: maxminTheme.colors.muted,
            }}
          >
            {dto.cta.intensity === 'hot'
              ? 'Critical gaps identified'
              : dto.cta.intensity === 'warm'
              ? 'Room for improvement'
              : 'Strong foundation'}
          </div>
          <div
            style={{
              fontSize: 14,
              color: maxminTheme.colors.muted,
            }}
          >
            maxmin.co
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
