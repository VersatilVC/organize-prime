# Content Extraction Setup Guide

## Overview

The content extraction system allows you to automatically extract text content from files and URLs, converting them to markdown format for use in your content creation workflows.

## Features

- **Multiple file format support**: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, MD, HTML, HTM, RTF
- **URL content extraction**: Extract content from web pages
- **Markdown conversion**: All content is converted to clean markdown format
- **Real-time processing**: Extract content directly from the content type management interface
- **Extraction tracking**: Full audit trail of all extraction operations
- **Error handling**: Comprehensive error reporting and recovery

## Setup Instructions

### 1. Get ConvertAPI Credentials

1. Visit https://www.convertapi.com and sign up for a free account
2. Navigate to your dashboard and find your API secret key
3. Copy the secret key (it will look like: `xxx_xxxxxxxxxx`)

### 2. Configure Supabase Edge Function Secret

1. Add your ConvertAPI secret to Supabase:
   ```bash
   npx supabase secrets set CONVERTAPI_SECRET=your_convertapi_secret_here
   ```
2. The Edge Function will automatically use this secret for conversions

### 3. Database Schema

The database schema has been automatically updated with:
- New columns in `content_types` table for extraction metadata
- New `content_extraction_logs` table for audit trails
- Proper indexes and RLS policies

## Usage

### Adding Content Types with Examples

1. Navigate to Content Creation Settings → Content Types
2. Create or edit a content type
3. Add examples by:
   - **File Upload**: Drag and drop or select files (PDF, DOC, etc.)
   - **URL Examples**: Add URLs to web content

### Extracting Content

**From Content Type Form (Recommended):**
- After saving a content type with examples
- Use the "Extract" button next to each example
- View extracted content in the form

**From Content Types List:**
- Use the sparkles (✨) icon to extract from all URL examples
- View extraction status in the "Extraction" column

### Monitoring Extractions

- **Status Indicators**:
  - 🔄 Processing: Extraction in progress
  - ✅ Extracted: Successfully completed
  - ❌ Failed: Extraction failed
  - ⏱️ Pending: Not yet processed

- **Extraction Logs**: All operations are logged in the database for debugging

## File Format Support

| Format | Extension | Status | Notes |
|--------|-----------|---------|-------|
| PDF | .pdf | ✅ Full | Text extraction with OCR fallback |
| Word | .doc, .docx | ✅ Full | Full document structure |
| PowerPoint | .ppt, .pptx | ✅ Full | Slide content extraction |
| Excel | .xls, .xlsx | ✅ Full | Table data as markdown |
| Plain Text | .txt, .md | ✅ Full | Direct processing |
| HTML | .html, .htm | ✅ Full | Clean markdown conversion |
| Rich Text | .rtf | ✅ Full | Formatted text extraction |

## API Usage Limits

### Free Tier (ConvertAPI)
- 100 conversions per month
- 10MB file size limit
- No commercial usage

### Paid Tiers
- Higher conversion limits
- Larger file sizes (up to 100MB)
- Commercial usage allowed
- Priority processing

## Troubleshooting

### Common Issues

1. **"ConvertAPI not configured" error**
   - Check your Supabase secret is set: `npx supabase secrets list`
   - Verify the secret key is valid on ConvertAPI dashboard
   - Ensure the Edge Function is deployed correctly

2. **File upload fails**
   - Check file size (must be under limit)
   - Verify file format is supported
   - Check network connection

3. **URL extraction fails**
   - Ensure URL is publicly accessible
   - Check for CORS restrictions
   - Verify content type is supported

### Debug Information

The system provides extensive logging:
- Browser console shows detailed extraction steps
- Database logs track all operations
- Error messages include specific failure reasons

### Getting Help

1. Check the browser console for detailed error messages
2. Review the extraction logs in the database
3. Verify your ConvertAPI account status and limits
4. Test with smaller files first

## Implementation Details

### Architecture

```
ContentTypeForm
├── File Upload → Supabase Storage
├── Content Extraction Service
│   ├── ConvertAPI Integration
│   ├── Format Detection
│   └── Markdown Conversion
├── Database Updates
│   ├── content_types.extracted_content
│   └── content_extraction_logs
└── Real-time Status Updates
```

### Security

- All files are securely stored in Supabase Storage
- Organization-based access control (RLS)
- API keys are environment-scoped
- No sensitive data in extraction logs

### Performance

- Background processing for large files
- Efficient caching of extraction results
- Optimized database queries
- Rate limiting protection

## Next Steps

After successful setup, you can:

1. **Create content types** with example files and URLs
2. **Extract content** to build your content library
3. **Use extracted content** as training data for AI models
4. **Analyze patterns** across different content types
5. **Integrate with N8N workflows** for automated processing

## Support

For technical issues:
1. Check this documentation first
2. Review error messages and logs
3. Test with simple examples
4. Contact support with specific error details

The system is designed to be robust and user-friendly, with comprehensive error handling and clear feedback at every step.