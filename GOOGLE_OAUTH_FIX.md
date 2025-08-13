# Google OAuth & Performance Fix Guide

## 🚨 **Critical Issues Found**

### 1. **Google OAuth "Missing authorization code" Error**

**Root Cause**: OAuth PKCE state management conflicts and domain configuration mismatches.

**Current Domain**: Check your current Lovable project URL and ensure it matches your Google Cloud Console configuration.

### 2. **Performance Issues** 
**Root Cause**: Heavy component loading without proper loading states and context provider conflicts.

---

## 🔧 **Immediate Fixes Required**

### **Step 1: Check Current Domain**

1. **Find your current Lovable project URL**:
   - Go to your Lovable project dashboard
   - Copy the full domain (e.g., `https://your-project.lovableproject.com`)

### **Step 2: Update Google Cloud Console**

1. **Go to Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Edit your OAuth 2.0 Client ID**:
   - Click on your OAuth client
   - Under **Authorized JavaScript origins**:
     - Remove any old URLs
     - Add: `https://your-project.lovableproject.com` (your actual URL)
   
   - Under **Authorized redirect URIs**:
     - Remove any old callback URLs
     - Add: `https://your-project.lovableproject.com/auth/callback`

3. **Save changes**

### **Step 3: Update Supabase Settings**

1. **Go to Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/cjwgfoingscquolnfkhh
   ```

2. **Update Authentication Settings**:
   - Go to Authentication → URL Configuration
   - **Site URL**: `https://your-project.lovableproject.com`
   - **Redirect URLs**: `https://your-project.lovableproject.com/auth/callback`

3. **Save configuration**

### **Step 4: Clear OAuth State**

In your browser console, run:
```javascript
// Clear all OAuth state
localStorage.removeItem('pkce_code_verifier');
localStorage.removeItem('oauth_state');
localStorage.removeItem('auth_callback_url');
localStorage.removeItem('oauth_error');
localStorage.removeItem('pkce_failure_count');
sessionStorage.removeItem('auth_retry_count');

// Clear Supabase auth tokens
localStorage.removeItem('supabase.auth.token');
localStorage.removeItem('sb-auth-token');

console.log('OAuth state cleared');
```

---

## 🚀 **Performance Fixes**

### **Fix 1: Simplify App.tsx Context Providers**

The current context nesting is causing performance issues. Update `src/App.tsx`:

```typescript
// Simplified and optimized
function App() {
  return (
    <StrictMode>
      <AdvancedErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <SimpleAuthProvider>
                <OrganizationProvider>
                  <FeatureProvider slug="">
                    <SEOHead />
                    <SkipToContent />
                    
                    <main id="main-content" className="min-h-screen bg-background" tabIndex={-1}>
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
                        <AppRoutes />
                      </Suspense>
                    </main>
                    
                    <Toaster />
                  </FeatureProvider>
                </OrganizationProvider>
              </SimpleAuthProvider>
            </ThemeProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AdvancedErrorBoundary>
    </StrictMode>
  );
}
```

### **Fix 2: Add Proper Loading States**

Update `src/AppRoutes.tsx` with better Suspense boundaries:

```typescript
// Add this loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Wrap each Route with Suspense
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <Suspense fallback={<LoadingSpinner />}>
          <Index />
        </Suspense>
      } />
      
      <Route path="/auth" element={
        <Suspense fallback={<LoadingSpinner />}>
          <Auth />
        </Suspense>
      } />
      
      <Route path="/auth/callback" element={
        <Suspense fallback={<LoadingSpinner />}>
          <AuthCallback />
        </Suspense>
      } />
      
      {/* Add Suspense to all other routes similarly */}
    </Routes>
  );
}
```

---

## 🔍 **Testing & Verification**

### **Step 1: Clear Browser Data**
1. Open Developer Tools (F12)
2. Go to Application → Storage
3. Clear all data for your domain
4. Hard refresh (Ctrl+Shift+R)

### **Step 2: Test OAuth Flow**
1. Go to `/auth`
2. Click "Google" sign in
3. Check browser console for detailed logs
4. Should redirect to Google → back to your app

### **Step 3: Verify Performance**
1. Open Network tab in DevTools
2. Reload the page
3. Check for:
   - Initial page load < 3 seconds
   - No failed requests
   - Smooth navigation

---

## 🚨 **If Issues Persist**

### **Debug OAuth Issues**:
```javascript
// Run in browser console to debug OAuth state
import { AuthDiagnostics } from '@/lib/auth-diagnostics';

// Check current configuration
AuthDiagnostics.validateDomainConfiguration();
AuthDiagnostics.logOAuthState();

// Get setup guide
console.log(AuthDiagnostics.getAuthGuideMessage());
```

### **Debug Performance Issues**:
1. Check React DevTools → Profiler
2. Look for unnecessary re-renders
3. Check Network tab for slow requests
4. Monitor memory usage

---

## 📝 **Expected Results**

After applying these fixes:

✅ **Google OAuth should work** - No more "Missing authorization code" errors  
✅ **Page loads faster** - Under 3 seconds initial load  
✅ **Smooth navigation** - No delays between pages  
✅ **Better error handling** - Clear error messages  

---

## 🆘 **Still Having Issues?**

1. **Check the exact error message** in browser console
2. **Verify your current domain** matches OAuth settings exactly
3. **Try incognito mode** to eliminate cached state issues
4. **Test with a fresh Google account** to isolate account-specific issues

The most common issue is domain mismatch - make sure your current Lovable project URL exactly matches what's configured in Google Cloud Console and Supabase.
