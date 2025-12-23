import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; qaId: string }> }) {
  try {
    const { id: selectionId, qaId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch QA session from Supabase
    const { data: session, error: sessionError } = await supabase
      .from('qa_sessions')
      .select(
        `
                *,
                selections (
                    name
                )
            `
      )
      .eq('id', qaId)
      .eq('user_id', user.id)
      .eq('selection_id', selectionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'QA session not found' }, { status: 404 });
    }

    // Fetch Q&A answers from Supabase (saved by Inngest function after Haystack API calls)
    const { data: answers, error: answersError } = await supabase
      .from('qa_answers')
      .select('*')
      .eq('session_id', qaId)
      .order('created_at', { ascending: true });

    if (answersError) {
      console.error('[QA API] Failed to fetch QA answers:', answersError);
      // Continue anyway - return empty answers array
    }

    // Map answers to match frontend interface
    const mappedAnswers = (answers || []).map((answer: any) => ({
      id: answer.id,
      doc_id: answer.doc_id,
      name: answer.name || '',
      email: answer.email || '',
      city: answer.city || '',
      answer: answer.answer || '',
      status: answer.status === 'success' ? 'success' : 'failed',
      error_message: answer.error_message || undefined,
    }));

    const response = {
      id: session.id,
      selection_id: session.selection_id,
      selection_name: (session.selections as any)?.name || 'Unknown Selection',
      prompt: session.prompt,
      status: session.status,
      progress: session.progress || 0,
      created_at: session.created_at,
      completed_at: session.completed_at || undefined,
      error_message: session.error_message || undefined,
      csv_url: session.csv_url || undefined,
      answers: mappedAnswers,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[QA API] Unexpected error fetching QA session:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch QA session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
