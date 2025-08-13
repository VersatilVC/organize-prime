# 🔍 OAuth PKCE Debug Guide

## **Current Error: "Authentication state error"**

This error means the OAuth flow is starting but failing during the callback process. This is typically a **PKCE (Proof Key for Code Exchange) state mismatch**.

---

## **🚨 Immediate Debug Steps**

### **Step 1: Clear All OAuth State**
Open browser console on `https://preview--organize-prime.lovable.app/` and run:

```javascript
// Clear all OAuth and auth state
localStorage.clear();
sessionStorage.clear();

// Also clear specific OAuth keys
const oauthKeys = [
  'pkce_code_verifier',
  'oauth_state', 
  'auth_callback_url',
  'oauth_error',
  'auth_failure_count',
  'supabase.auth.token',
  'sb-auth-token'
];

oauthKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Cleared: ${key}`);
});

console.log('✅ All OAuth state cleared');

// Reload the page
location.reload();
```

### **Step 2: Test OAuth Flow with Console Monitoring**

1. **Go to**: `/auth` page
2. **Open browser DevTools** → Console tab
3. **Click "Google" sign-in**
4. **Watch console logs** for detailed OAuth flow information

### **Step 3: Check for Specific Error Patterns**

Look for these common PKCE errors in console:
- `"code verifier"` - PKCE state corruption
- `"invalid request"` - Malformed OAuth request
- `"redirect_uri_mismatch"` - URL configuration issue
- `"unauthorized_client"` - Google Cloud Console configuration

---

## **🔧 Common PKCE Fix Solutions**

### **Solution A: URL Configuration Issue**

**Problem**: Your Google Cloud Console URLs still don't match exactly.

**Check**: Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and verify:
- **Authorized JavaScript origins**: `https://preview--organize-prime.lovable.app` (NO trailing slash)
- **Authorized redirect URIs**: `https://preview--organize-prime.lovable.app/auth/callback` (WITH /auth/callback)

**Common Mistakes**:
- ❌ `https://preview--organize-prime.lovable.app/` (trailing slash)
- ❌ `http://` instead of `https://`
- ❌ Old project URLs still listed
- ❌ Missing `/auth/callback` in redirect URI

### **Solution B: Supabase Configuration Issue**

**Check**: Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/cjwgfoingscquolnfkhh/auth/url-configuration) and verify:
- **Site URL**: `https://preview--organize-prime.lovable.app` (NO trailing slash)
- **Redirect URLs**: `https://preview--organize-prime.lovable.app/auth/callback`

### **Solution C: Browser-Specific Issues**

**Try these tests**:
1. **Incognito mode** - Rules out extension conflicts
2. **Different browser** - Chrome vs Firefox vs Safari
3. **Clear all data** - Not just cache, but all site data

---

## **🔍 Advanced Debugging**

### **Enable Detailed OAuth Logging**

Add this to browser console BEFORE clicking Google sign-in:

```javascript
// Monitor OAuth flow
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0] && args[0].includes('auth') || args[0].includes('oauth')) {
    console.log('🔍 OAuth Request:', args);
  }
  return originalFetch.apply(this, args);
};

// Monitor localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key.includes('pkce') || key.includes('oauth') || key.includes('auth')) {
    console.log(`🔑 LocalStorage Set: ${key} = ${value.substring(0, 20)}...`);
  }
  return originalSetItem.apply(this, arguments);
};

console.log('✅ OAuth monitoring enabled');
```

### **Manual OAuth State Check**

Run this AFTER clicking Google sign-in but BEFORE the redirect:

```javascript
// Check OAuth state
const verifier = localStorage.getItem('pkce_code_verifier');
const state = localStorage.getItem('oauth_state');

console.log('🔍 OAuth State Check:', {
  hasVerifier: !!verifier,
  verifierLength: verifier?.length,
  hasState: !!state,
  currentUrl: window.location.href
});

if (!verifier) {
  console.error('❌ PKCE verifier missing - this will cause "Authentication state error"');
} else {
  console.log('✅ PKCE verifier present');
}
```

---

## **🎯 Specific Error Solutions**

### **If Console Shows: "Missing PKCE code verifier"**
```javascript
// This means OAuth state was cleared mid-flow
// Solution: Clear everything and try again
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### **If Console Shows: "redirect_uri_mismatch"**
```javascript
// This means Google Cloud Console URLs are wrong
console.log('❌ Fix required: Update Google Cloud Console URLs to:', window.location.origin);
```

### **If Console Shows: "unauthorized_client"**
```javascript
// This means OAuth client configuration is invalid
console.log('❌ Check Google Cloud Console OAuth client settings');
```

---

## **🚀 Test Plan**

1. **Clear all state** (Step 1 above)
2. **Enable monitoring** (Advanced debugging)
3. **Try OAuth flow**
4. **Check console logs** for specific error
5. **Apply appropriate solution** based on error

---

## **📞 If Still Failing**

Run this comprehensive diagnostic:

```javascript
// Complete OAuth diagnostic
const diagnostic = {
  currentUrl: window.location.href,
  origin: window.location.origin,
  pathname: window.location.pathname,
  localStorage: {
    verifier: localStorage.getItem('pkce_code_verifier'),
    state: localStorage.getItem('oauth_state'),
    error: localStorage.getItem('oauth_error')
  },
  userAgent: navigator.userAgent,
  cookies: document.cookie
};

console.log('🔍 Complete OAuth Diagnostic:', JSON.stringify(diagnostic, null, 2));
```

Copy this output and it will help identify the exact OAuth configuration issue.

The "Authentication state error" is specifically a PKCE flow issue, which means the OAuth initiation worked but the callback verification failed. This is almost always a configuration mismatch between your actual domain and what's configured in Google Cloud Console or Supabase.
