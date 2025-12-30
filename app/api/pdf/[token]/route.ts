import { getResultsDto } from '@/lib/assessment/getResultsDto';
import { isValidResultToken } from '@/lib/tokens';
import { generatePdf } from '@/lib/pdf/generatePdf';
import { getCachedPdf, cachePdf } from '@/lib/pdf/cache';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Validate token format
  if (!isValidResultToken(token)) {
    return new Response('Invalid token', { status: 400 });
  }

  // Try cache first
  const cached = await getCachedPdf(token);
  if (cached) {
    return new Response(Buffer.from(cached), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="maxmin-results-${token}.pdf"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  // Fetch results
  const dto = await getResultsDto(token);
  if (!dto) {
    return new Response('Results not found', { status: 404 });
  }

  // Generate PDF
  const pdfBytes = await generatePdf(dto);

  // Cache for future requests (async, don't await)
  cachePdf(token, pdfBytes).catch(() => {});

  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="maxmin-results-${token}.pdf"`,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
