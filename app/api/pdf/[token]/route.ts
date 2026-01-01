import { NextResponse } from 'next/server';
import { isValidResultToken } from '@/lib/tokens';
import { getResultsForPdf } from '@/lib/results/getResultsForPdf';
import { generateConsultantPdf } from '@/lib/pdf/generateConsultantPdf';
import { loadPdfPacks } from '@/lib/pdf/content/loadPacks';
import { getCachedPdf, cachePdf } from '@/lib/pdf/cache';
import { env } from '@/env';

export const runtime = 'nodejs';

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token format
  if (!isValidResultToken(token)) {
    return error('VALIDATION_ERROR', 'Invalid token.', 400);
  }

  // Try cache first
  const cached = await getCachedPdf(token);
  if (cached) {
    return new NextResponse(Buffer.from(cached), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="maxmin-assessment-${token}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });
  }

  try {
    // Fetch results with answers for enrichment
    const [data, packs] = await Promise.all([
      getResultsForPdf(token),
      loadPdfPacks(),
    ]);

    if (!data) {
      return error('NOT_FOUND', 'Results not found.', 404);
    }

    // Render the Swiss-beige consultant PDF using pdf-lib
    const baseUrl = env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const pdfBytes = await generateConsultantPdf({ data, packs, baseUrl });

    // Cache for future requests (async, don't await)
    const pdfBuffer = Buffer.from(pdfBytes);
    cachePdf(token, pdfBuffer).catch(() => {});

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="maxmin-assessment-${token}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[PDF] Generation failed:', { message, stack });

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json(
        { error: { code: 'GENERATION_FAILED', message, stack } },
        { status: 500 }
      );
    }

    return error('GENERATION_FAILED', 'Could not generate PDF.', 500);
  }
}
