-- Create client_summaries table
CREATE TABLE IF NOT EXISTS uniqu.client_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES uniqu.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES uniqu.users(user_uuid) ON DELETE CASCADE,
    session_id UUID REFERENCES uniqu.questionnaire_sessions(id) ON DELETE SET NULL,
    summary_content TEXT NOT NULL,
    summary_html TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(agency_id, user_id, session_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_summaries_agency_user ON uniqu.client_summaries(agency_id, user_id);
CREATE INDEX IF NOT EXISTS idx_client_summaries_status ON uniqu.client_summaries(status);
CREATE INDEX IF NOT EXISTS idx_client_summaries_created_at ON uniqu.client_summaries(created_at);

-- Enable RLS
ALTER TABLE uniqu.client_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Agencies can view their own client summaries" ON uniqu.client_summaries
    FOR SELECT USING (
        agency_id IN (
            SELECT id FROM uniqu.agencies 
            WHERE id = agency_id
        )
    );

CREATE POLICY "Agencies can insert their own client summaries" ON uniqu.client_summaries
    FOR INSERT WITH CHECK (
        agency_id IN (
            SELECT id FROM uniqu.agencies 
            WHERE id = agency_id
        )
    );

CREATE POLICY "Agencies can update their own client summaries" ON uniqu.client_summaries
    FOR UPDATE USING (
        agency_id IN (
            SELECT id FROM uniqu.agencies 
            WHERE id = agency_id
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION uniqu.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_client_summaries_updated_at 
    BEFORE UPDATE ON uniqu.client_summaries 
    FOR EACH ROW EXECUTE FUNCTION uniqu.update_updated_at_column();
