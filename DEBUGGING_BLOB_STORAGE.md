# Debugging Blob Storage Issue

## Changes Made for Debugging

### 1. Environment Variable Flexibility
- Updated Inngest workflow to support both `BLOB_READ_WRITE_TOKEN` and `NEWSLETTER_READ_WRITE_TOKEN`
- Updated results API to also check both environment variables
- Added logging to show which token is being used

### 2. Enhanced Logging in Inngest Workflow

#### Token Configuration Logging
- Logs whether `BLOB_READ_WRITE_TOKEN` exists
- Logs whether `NEWSLETTER_READ_WRITE_TOKEN` exists  
- Logs whether a token was successfully configured

#### Step 4 (Blob Save) Detailed Logging
- Logs before entering step.run()
- Logs the blob key being used
- Logs the size of data being saved
- Logs a preview of the data structure
- Logs the stringified data length and first 200 characters
- Logs all parameters being passed to put()
- Logs the full response from put()
- Logs validation of the saved result

#### Error Logging Enhancement
- Logs error type, message, and stack trace
- Logs available environment variables containing 'BLOB' or 'TOKEN'
- Logs full error objects for debugging

### 3. New Debug Endpoints

#### `/api/debug/blob-status/[sessionId]`
- Checks if a specific session's blob exists
- Lists all blobs for the user
- Shows the expected blob key
- Reports which token is being used

### 4. Key Things to Check in Logs

1. **Token Configuration**
   - Look for: `[Inngest] FASHION_BLOB_TOKEN configured: true/false`
   - This confirms if a token is available

2. **Blob Save Process**
   - Look for: `[Inngest] STEP 4: Inside step.run - calling saveFashionResults...`
   - This confirms the save step is being executed

3. **Blob Put Response**
   - Look for: `[Inngest] Blob put() returned:`
   - This shows what Vercel Blob API returned

4. **Success Confirmation**
   - Look for: `[Inngest] STEP 4 COMPLETED - Results saved successfully!`
   - This confirms the blob was saved

5. **Error Messages**
   - Look for: `[Inngest] CRITICAL: Error saving fashion results to blob`
   - This indicates a save failure with details

## Common Issues to Check

1. **Environment Variable Mismatch**
   - Make sure you have either `BLOB_READ_WRITE_TOKEN` or `NEWSLETTER_READ_WRITE_TOKEN` set
   - The example file uses `NEWSLETTER_READ_WRITE_TOKEN`

2. **Token Permissions**
   - Ensure the token has write permissions
   - Check if the token is valid and not expired

3. **Blob Key Format**
   - Expected format: `fashion-results/{userId}/{sessionId}.json`
   - Both Inngest and results API use this same format

4. **Workflow Completion**
   - Check if all 4 steps complete successfully
   - Look for `[Inngest] WORKFLOW COMPLETED SUCCESSFULLY`

## Testing Steps

1. Run a new fashion analysis request
2. Check terminal output for the enhanced logs
3. Use the debug endpoint to check blob status:
   ```
   curl http://localhost:3000/api/debug/blob-status/[sessionId]
   ```
4. Use the test blob endpoint to verify blob storage works:
   ```
   curl http://localhost:3000/api/debug/test-blob
   ```

## Next Steps

Based on the logs, we can determine:
- If the token is configured correctly
- If the blob save is being attempted
- What response the Vercel Blob API is returning
- If there are any permission or configuration issues