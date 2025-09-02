# Webhook Trigger Fixes - September 2, 2025

## Issues Fixed

### 1. AI Prompts Duplication Loop
**Problem**: The n8n webhook was creating duplicate AI prompts (26 duplicates of "Default Blog Post") due to a trigger loop.

**Root Cause**: 
- The `content_types_webhook_trigger` fired on UPDATE operations
- The `safe_update_content_types_no_triggers()` function updated content types after extraction
- This triggered the webhook again, creating infinite loops

**Solution Applied**:
- Updated `notify_content_type_change()` function to only trigger on meaningful changes (name, description, examples, is_active)
- Added session variable support (`app.skip_webhook_trigger`) to bypass triggers during safe updates
- Enhanced `safe_update_content_types_no_triggers()` to actually skip triggers

### 2. Missing INSERT Webhook Support
**Problem**: Webhooks only fired on UPDATE operations, not when new content types were created.

**Solution Applied**:
- Updated the `content_types_webhook_trigger` to fire on both INSERT and UPDATE
- Modified `notify_content_type_change()` function to handle INSERT operations
- Added `operation_type` field to webhook payload to distinguish INSERT vs UPDATE

### 3. Webhook Function SQL Errors
**Problem**: The webhook trigger function had SQL errors (`column "status" does not exist`) that caused silent failures.

**Solution Applied**:
- Fixed the `net.http_post` response handling
- Added comprehensive error handling and logging
- Enhanced debug logging to track webhook execution

## Database Migrations Applied

1. **fix_webhook_trigger_loop** - Fixed the infinite loop issue with trigger filtering
2. **update_safe_update_function_with_trigger_bypass_v2** - Added session variable bypass support
3. **add_insert_support_to_webhook_trigger** - Added INSERT support and operation_type field
4. **add_insert_trigger_to_webhook** - Updated trigger to fire on both INSERT and UPDATE
5. **add_debug_to_webhook_trigger** - Enhanced logging for debugging
6. **fix_webhook_status_column_error** - Fixed SQL errors in webhook function

## Current Webhook Behavior

### INSERT (New Content Type)
- **Triggers**: Immediately when content type is created
- **Payload**: 
  ```json
  {
    "operation_type": "INSERT",
    "payload": { /* full content_type record */ },
    // ... standard webhook structure
  }
  ```

### UPDATE (Existing Content Type)  
- **Triggers**: Only on meaningful field changes (name, description, examples, is_active)
- **Skips**: Extraction-only updates (extraction_status, extracted_content, etc.)
- **Payload**:
  ```json
  {
    "operation_type": "UPDATE", 
    "payload": { /* updated content_type record */ },
    // ... standard webhook structure
  }
  ```

## Testing Results

✅ INSERT webhooks working correctly  
✅ UPDATE webhooks working correctly  
✅ Trigger bypass working for extraction updates  
✅ No more duplicate AI prompts  
✅ Comprehensive error handling and logging  

## N8N Workflow Updates Required

Your n8n workflow now needs to handle the new `operation_type` field to distinguish between new content types (INSERT) and updated ones (UPDATE).

## Database Changes Summary

- **Functions Modified**: `notify_content_type_change()`, `safe_update_content_types_no_triggers()`
- **Triggers Modified**: `content_types_webhook_trigger` (now fires on INSERT and UPDATE)
- **New Features**: Operation type detection, session variable bypass, enhanced logging
- **Cleanup**: Removed 25 duplicate AI prompt entries

All changes have been tested and are working correctly in production.