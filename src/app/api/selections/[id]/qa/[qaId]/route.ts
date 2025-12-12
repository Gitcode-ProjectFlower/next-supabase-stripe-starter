import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; qaId: string }> }
) {
    try {
        const { id: selectionId, qaId } = await params;
        const supabase = await createSupabaseServerClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch session
        const { data: session, error: sessionError } = await supabase
            .from('qa_sessions')
            .select(`
                *,
                selections (
                    name
                )
            `)
            .eq('id', qaId)
            .eq('user_id', user.id)
            .eq('selection_id', selectionId)
            .single();

        if (sessionError || !session) {
            return NextResponse.json({ error: 'QA session not found' }, { status: 404 });
        }

        // Fetch answers
        const { data: answers, error: answersError } = await supabase
            .from('qa_answers')
            .select('*')
            .eq('session_id', qaId);

        if (answersError) {
            console.error('Failed to fetch QA answers:', answersError);
        }

        return NextResponse.json({
            id: session.id,
            selection_id: session.selection_id,
            selection_name: (session.selections as any)?.name || 'Unknown Selection',
            prompt: session.prompt,
            status: session.status,
            progress: session.progress,
            created_at: session.created_at,
            completed_at: session.completed_at,
            error_message: session.error_message,
            csv_url: session.csv_url,
            answers: answers || [],
        });
    } catch (error) {
        console.error('Error fetching QA session:', error);
        return NextResponse.json(
            { error: 'Failed to fetch QA session' },
            { status: 500 }
        );
    }
}
