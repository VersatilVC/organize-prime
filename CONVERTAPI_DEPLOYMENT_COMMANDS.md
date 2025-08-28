# ConvertAPI Edge Function Deployment Commands

## 1. Set ConvertAPI Secret in Supabase
```bash
# Using Supabase CLI (if available)
supabase secrets set CONVERT_API_SECRET=your_convertapi_secret_here

# OR using Supabase Dashboard:
# 1. Go to https://supabase.com/dashboard/project/[your-project-id]/settings/edge-functions
# 2. Add environment variable: CONVERT_API_SECRET = your_convertapi_secret_here
```

## 2. Redeploy Edge Function
```bash
# If Supabase CLI is available:
supabase functions deploy content-extraction

# OR manually redeploy through dashboard
```

## 3. Verify Deployment
```bash
# Test the Edge Function with authentication
curl -X POST "https://cjwgfoingscquolnfkhh.supabase.co/functions/v1/content-extraction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{"type": "url", "content": "https://example.com", "filename": "test", "contentTypeId": "test-id"}'
```

## 4. Get ConvertAPI Secret
If you don't have a ConvertAPI secret:
1. Visit https://www.convertapi.com/
2. Sign up for free account (1500 free conversions)
3. Get your secret from the dashboard
4. Use the secret in the environment variable above