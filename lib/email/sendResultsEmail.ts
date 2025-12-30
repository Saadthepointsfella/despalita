import { Resend } from 'resend';
import { env } from '@/env';
import type { ResultsDTO } from '@/lib/results/types';
import { maxminTheme } from '@/lib/theme/maxminTheme';

/**
 * Send the assessment results email via Resend.
 * Silently fails if RESEND_API_KEY is not configured.
 */
export async function sendResultsEmail(
  email: string,
  dto: ResultsDTO
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Skip if Resend is not configured
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    console.log('[email] Resend not configured, skipping email');
    return { success: false, error: 'Resend not configured' };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const resultsUrl = `${siteUrl}/results/${dto.token}`;
  const pdfUrl = `${siteUrl}/api/pdf/${dto.token}`;

  const levelNum = dto.overall.level.level;
  const levelInfo = maxminTheme.levelColors[levelNum] ?? {
    label: `Level ${levelNum}`,
  };

  // Build HTML email
  const html = buildEmailHtml({
    company: dto.company,
    score: dto.overall.score_capped,
    level: levelNum,
    levelLabel: levelInfo.label,
    dimensions: dto.dimensions,
    resultsUrl,
    pdfUrl,
    intensity: dto.cta.intensity,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM,
      to: email,
      subject: `Your MaxMin Assessment Results${dto.company ? ` - ${dto.company}` : ''}`,
      html,
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[email] Sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email] Failed to send:', message);
    return { success: false, error: message };
  }
}

interface EmailData {
  company: string | null;
  score: number;
  level: number;
  levelLabel: string;
  dimensions: ResultsDTO['dimensions'];
  resultsUrl: string;
  pdfUrl: string;
  intensity: 'hot' | 'warm' | 'cool';
}

function buildEmailHtml(data: EmailData): string {
  const { company, score, level, levelLabel, dimensions, resultsUrl, pdfUrl, intensity } = data;

  const headline = company ? `${company}'s Assessment Results` : 'Your Assessment Results';

  const intensityCopy = {
    hot: 'You have compounding upside - but foundations are leaking.',
    warm: "You're close - a few systems will unlock the next tier.",
    cool: "You're operating clean. Now optimize for leverage.",
  };

  const dimensionRows = dimensions
    .slice(0, 6)
    .map((d) => {
      const tierBadge =
        d.tier === 'low'
          ? '<span style="color: #b91c1c;">Low</span>'
          : d.tier === 'medium'
          ? '<span style="color: #b45309;">Medium</span>'
          : '<span style="color: #15803d;">High</span>';

      return `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5;">
            <strong>${d.short_label}</strong><br>
            <span style="color: #666; font-size: 13px;">${d.name}</span>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e5e5; text-align: right;">
            ${d.score.toFixed(1)} ${tierBadge}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f3ef; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f5f3ef;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e5e5e5;">
              <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                MaxMin DTC Assessment
              </div>
              <h1 style="margin: 0; font-size: 24px; color: #1c1917; font-weight: 600;">
                ${headline}
              </h1>
            </td>
          </tr>

          <!-- Score Section -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td>
                    <div style="font-size: 48px; font-weight: 700; color: #1c1917;">
                      ${score.toFixed(1)}
                    </div>
                    <div style="font-size: 14px; color: #666;">
                      Level ${level}: ${levelLabel}
                    </div>
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <div style="display: inline-block; background-color: ${intensity === 'hot' ? '#fef2f2' : intensity === 'warm' ? '#fefce8' : '#f0fdf4'}; padding: 8px 16px; border-radius: 20px; font-size: 13px; color: ${intensity === 'hot' ? '#b91c1c' : intensity === 'warm' ? '#b45309' : '#15803d'};">
                      ${intensity === 'hot' ? 'Critical gaps' : intensity === 'warm' ? 'Room to grow' : 'Strong'}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; color: #666; font-size: 14px; line-height: 1.5;">
                ${intensityCopy[intensity]}
              </p>
            </td>
          </tr>

          <!-- Dimensions -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                ${dimensionRows}
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e5e5;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td>
                    <a href="${resultsUrl}" style="display: inline-block; background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                      View Full Results
                    </a>
                  </td>
                  <td style="text-align: right;">
                    <a href="${pdfUrl}" style="display: inline-block; color: #1c1917; padding: 12px 24px; text-decoration: none; font-size: 14px;">
                      Download PDF &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                This email was sent by MaxMin. If you didn't request this assessment, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
