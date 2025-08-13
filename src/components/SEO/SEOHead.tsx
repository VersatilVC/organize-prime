import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  siteName?: string;
}

const DEFAULT_SEO = {
  title: 'OrganizePrime - Ultimate B2B SaaS Platform',
  description: 'Enterprise-grade multi-tenant SaaS platform with advanced organization management, role-based access control, and comprehensive business tools.',
  keywords: 'B2B SaaS, organization management, multi-tenant, enterprise software, business platform, team collaboration',
  image: '/og-image.png',
  type: 'website' as const,
  siteName: 'OrganizePrime'
};

export function SEOHead({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
  siteName = DEFAULT_SEO.siteName
}: SEOProps) {
  const location = useLocation();
  
  const seoData = {
    title: title ? `${title} | ${DEFAULT_SEO.siteName}` : DEFAULT_SEO.title,
    description: description || DEFAULT_SEO.description,
    keywords: keywords || DEFAULT_SEO.keywords,
    image: image || DEFAULT_SEO.image,
    url: url || `${window.location.origin}${location.pathname}`,
    type,
    author,
    publishedTime,
    modifiedTime,
    siteName
  };

  useEffect(() => {
    // Update document title
    document.title = seoData.title;

    // Update meta tags
    updateMetaTag('description', seoData.description);
    updateMetaTag('keywords', seoData.keywords);
    updateMetaTag('author', seoData.author);

    // Open Graph tags
    updateMetaProperty('og:title', seoData.title);
    updateMetaProperty('og:description', seoData.description);
    updateMetaProperty('og:image', seoData.image);
    updateMetaProperty('og:url', seoData.url);
    updateMetaProperty('og:type', seoData.type);
    updateMetaProperty('og:site_name', seoData.siteName);

    // Twitter Card tags
    updateMetaProperty('twitter:card', 'summary_large_image');
    updateMetaProperty('twitter:title', seoData.title);
    updateMetaProperty('twitter:description', seoData.description);
    updateMetaProperty('twitter:image', seoData.image);

    // Article-specific tags
    if (seoData.type === 'article') {
      updateMetaProperty('article:author', seoData.author);
      updateMetaProperty('article:published_time', seoData.publishedTime);
      updateMetaProperty('article:modified_time', seoData.modifiedTime);
    }

    // Canonical URL
    updateCanonicalLink(seoData.url);

    // JSON-LD structured data
    updateStructuredData(seoData);

  }, [seoData.title, seoData.description, seoData.keywords, seoData.image, seoData.url, seoData.type, seoData.author, seoData.publishedTime, seoData.modifiedTime, seoData.siteName]);

  return null; // This component doesn't render anything
}

function updateMetaTag(name: string, content?: string) {
  if (!content) return;
  
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateMetaProperty(property: string, content?: string) {
  if (!content) return;
  
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function updateStructuredData(seoData: any) {
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': seoData.type === 'article' ? 'Article' : 'WebSite',
    name: seoData.title,
    description: seoData.description,
    url: seoData.url,
    image: seoData.image,
    ...(seoData.type === 'website' && {
      potentialAction: {
        '@type': 'SearchAction',
        target: `${seoData.url}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }),
    ...(seoData.author && {
      author: {
        '@type': 'Person',
        name: seoData.author
      }
    }),
    ...(seoData.publishedTime && {
      datePublished: seoData.publishedTime
    }),
    ...(seoData.modifiedTime && {
      dateModified: seoData.modifiedTime
    })
  };

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

// Hook for easy SEO management
export function useSEO(seoProps: SEOProps) {
  return <SEOHead {...seoProps} />;
}

// Route-specific SEO configurations
export const SEO_CONFIGS = {
  dashboard: {
    title: 'Dashboard',
    description: 'Comprehensive dashboard with real-time analytics, user management, and organizational insights for your business operations.',
    keywords: 'dashboard, analytics, business intelligence, real-time data, organization management'
  },
  users: {
    title: 'User Management',
    description: 'Advanced user management system with role-based access control, team organization, and comprehensive user analytics.',
    keywords: 'user management, team organization, role-based access, user analytics, permissions'
  },
  settings: {
    title: 'Settings',
    description: 'Comprehensive settings management for organizations, users, and system configurations with enterprise-grade security.',
    keywords: 'settings, configuration, security, organization settings, user preferences'
  },
  feedback: {
    title: 'Feedback Management',
    description: 'Comprehensive feedback management system for collecting, organizing, and responding to user feedback and feature requests.',
    keywords: 'feedback management, user feedback, feature requests, customer support, issue tracking'
  },
  knowledgeBase: {
    title: 'Knowledge Base',
    description: 'AI-powered knowledge base for document management, intelligent search, and organizational knowledge sharing.',
    keywords: 'knowledge base, document management, AI search, knowledge sharing, document processing'
  }
};