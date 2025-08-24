# Client Summary Feature

## Overview

The Client Summary feature allows agencies to generate comprehensive AI-powered summaries of their clients' career profiles, including insights from questionnaires, CV data, generated documents, and more.

## Features

### 1. Generate Client Summary
- **Button**: "Generate Client Summary" appears on the agency client page
- **Prerequisite**: Client must have completed the questionnaire
- **Process**: 
  - Creates a record in the `client_summaries` table
  - Calls the n8n webhook at `https://manage.app.n8n.cloud/webhook/clients/uniqu-agentsummary`
  - Shows real-time status updates

### 2. View Summary Status
- **Generating**: Shows spinner and "Generating..." status
- **Completed**: Shows "Completed" status with action buttons
- **Failed**: Shows "Failed" status with retry option

### 3. Summary Actions
- **View Summary**: Opens summary in new window/tab
- **Download PDF**: Downloads PDF if available
- **Regenerate**: Creates a new summary
- **Retry**: Retries failed generation

## Database Schema

### Table: `client_summaries`

```sql
CREATE TABLE uniqu.client_summaries (
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
```

## API Endpoints

### Webhook: `/api/webhooks/update-client-summary`

**Purpose**: Allows the n8n workflow to update summary status and content

**Method**: POST

**Body Parameters**:
- `summary_id` (required): UUID of the summary to update
- `status`: New status ('generating', 'completed', 'failed')
- `summary_content`: Plain text content
- `summary_html`: HTML formatted content
- `pdf_url`: URL to generated PDF
- `metadata`: Additional JSON data

**Example Request**:
```json
{
  "summary_id": "uuid-here",
  "status": "completed",
  "summary_content": "Client is a skilled software developer...",
  "summary_html": "<h2>Client Summary</h2><p>Client is a skilled...</p>",
  "pdf_url": "https://example.com/summary.pdf",
  "metadata": {
    "generation_time": "2.5s",
    "model_version": "gpt-4"
  }
}
```

## N8n Workflow Integration

### Webhook Call
The n8n workflow should call the update webhook when processing is complete:

```javascript
// After generating the summary
await fetch('/api/webhooks/update-client-summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    summary_id: summaryId,
    status: 'completed',
    summary_content: generatedText,
    summary_html: generatedHtml,
    pdf_url: pdfUrl,
    metadata: { /* additional info */ }
  })
});
```

### Workflow Data
The workflow receives:
- `user_id`: Client's user ID
- `session_id`: Questionnaire session ID
- `agency_id`: Agency ID
- `summary_id`: Database record ID to update

## Internationalization

The feature supports multiple languages:
- English (en)
- German (de)
- French (fr)
- Italian (it)
- Spanish (es)

Translation keys are under `agency.client.summary.*`

## Security

- Row Level Security (RLS) enabled
- Agencies can only access their own client summaries
- Webhook endpoint validates summary_id before updates

## Usage Flow

1. **Agency views client page**
2. **Clicks "Generate Client Summary"**
3. **System creates summary record and calls n8n webhook**
4. **N8n workflow processes the request**
5. **Workflow calls update webhook with results**
6. **Agency sees updated status and can view/download summary**

## Future Enhancements

- Summary templates for different client types
- Batch summary generation for multiple clients
- Summary analytics and insights
- Integration with application tracking
- Automated summary scheduling
