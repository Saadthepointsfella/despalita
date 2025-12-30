import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    // Lightweight DB check: try reading one dimension row
    const { error } = await supabase
      .from('dimensions')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'DB_ERROR', message: 'Database not reachable' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message },
      { status: 500 }
    );
  }
}
