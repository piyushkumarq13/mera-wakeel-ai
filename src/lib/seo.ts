// Central SEO configuration & helpers.
// Per-route metadata (title, description, canonical) is injected into the
// <head> on every tab change. Also manages Open Graph / Twitter cards and
// a single JSON-LD script that is rewritten per route (client-side SPA).

import type { Language } from '../types';

export const SITE_URL = 'https://mera-wakeel-ai.onrender.com';
export const SITE_NAME = 'Mera Wakeel AI';
export const LOGO_URL = `${SITE_URL}/logo.png`;
export const DEFAULT_LOCALE = 'en_IN';

interface RouteSeo {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
}

export const ROUTE_SEO: Record<string, RouteSeo> = {
  home: {
    title: 'Mera Wakeel AI — India ka Apna AI Legal Assistant (9 Bhashayein)',
    description:
      'Free AI-powered legal guidance in Hindi, English & 7 other Indian languages. Property, family, consumer, labour aur criminal law support, document scanning, aur verified advocates se connect karein.',
    keywords: [
      'mera wakeel ai', 'free legal advice india', 'ai lawyer india', 'legal assistant hindi',
      'property dispute help', 'online legal aid',
    ],
    path: '/',
  },
  'how-it-works': {
    title: 'How It Works — Mera Wakeel AI',
    description: '3 asaan steps: apni legal samasya batayein, AI guidance paayein, zarurat ho to verified advocate se juden. Private, encrypted aur free.',
    path: '/how-it-works',
  },
  'for-lawyers': {
    title: 'Advocate Portal — Bar Council Advocates ke liye Free Registration',
    description: 'Verified Haryana Bar Council advocates ke liye free profile, client leads, aur AI case briefs. 0% commission.',
    path: '/for-lawyers',
  },
  'my-cases': {
    title: 'My Cases — Mera Wakeel AI Dashboard',
    description: 'Apne legal cases, deadlines, documents aur advocate connections ko ek jagah manage karein.',
    path: '/my-cases',
  },
  chat: {
    title: 'AI Legal Consultation — 24x7 Chat with Mera Wakeel AI',
    description: 'Hindi, English, Hinglish, Tamil, Telugu, Marathi, Bengali, Kannada aur Gujarati mein free legal consultation. Instant AI answers.',
    path: '/chat',
  },
  lawyers: {
    title: 'Find Verified Lawyers — Mera Wakeel AI Advocate Directory',
    description: 'Practice area, city aur rating ke hisaab se verified advocates dhundhein aur request bharein. Bar Council verified directory.',
    path: '/lawyers',
  },
  advocates: {
    title: 'Advocate Directory — Find & Contact Verified Advocates',
    description: 'Verified advocates ki directory: property, family, criminal, consumer, labour aur civil law. Rating dekhein aur connect karein.',
    path: '/advocates',
  },
  documents: {
    title: 'Legal Document Reader & AI Scan — Mera Wakeel AI',
    description: 'Sale deed, khatauni, notice, FIR ya will ko AI se scan karein. Document type, usage aur authority verify hoti hai.',
    path: '/documents',
  },
  settings: {
    title: 'Settings & Privacy — Mera Wakeel AI',
    description: 'Language, notifications, voice aur privacy controls manage karein. DPDP Act compliant.',
    path: '/settings',
  },
  privacy: {
    title: 'Privacy Policy — Mera Wakeel AI',
    description: 'Mera Wakeel AI privacy policy: aapka data kaise store hota hai, GDPR & DPDP compliance, aur aapke adhikar.',
    path: '/privacy',
  },
  terms: {
    title: 'Terms & Conditions — Mera Wakeel AI',
    description: 'Citizens aur advocates dono ke liye Mera Wakeel AI terms — verification, fees, ethics aur liabilities.',
    path: '/terms',
  },
  auth: {
    title: 'Login & Register — Mera Wakeel AI',
    description: 'Free account banayein apne legal cases aur consultations ke liye. Citizen ya Advocate ke roop mein register karein.',
    path: '/login',
  },
  'draft-documents': {
    title: 'AI Document Drafting — Sale Deed, Will, Notice',
    description: 'AI se legal documents draft karein: rent agreement, will, legal notice, affidavit aur plain text mein download karein.',
    path: '/draft-documents',
  },
  'free-legal-aid': {
    title: 'Free Govt Legal Aid (NALSA) — Mera Wakeel AI',
    description: 'Government legal aid schemes, NALSA services, eligibility aur free helpline numbers ki complete guide.',
    path: '/free-legal-aid',
  },
  admin: {
    title: 'Admin Dashboard — Mera Wakeel AI',
    description: 'Admin analytics, pending lawyer verifications aur moderation dashboard.',
    path: '/admin',
  },
  support: {
    title: 'Help & Support — Mera Wakeel AI',
    description: 'Submit, track aur manage karein apne support tickets. Admin reply dekhein aur apni history check karein.',
    path: '/support',
  },
  'knowledge-base': {
    title: 'Knowledge Base — Mera Wakeel AI',
    description: 'Legal topics, guides aur resources ki complete knowledge base.',
    path: '/knowledge-base',
  },
  register: {
    title: 'Register — Mera Wakeel AI',
    description: 'Free account banayein apne legal cases aur consultations ke liye.',
    path: '/register',
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function updateJsonLd(tab: string) {
  const existing = document.getElementById('mw-seo-jsonld');
  if (existing) existing.remove();

  const route = ROUTE_SEO[tab] || ROUTE_SEO.home;
  const url = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
  const base = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: LOGO_URL,
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'merawakeelai@gmail.com',
          contactType: 'customer support',
          areaServed: 'IN',
          availableLanguage: ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Kannada', 'Gujarati'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: ['en-IN', 'hi-IN'],
      },
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: route.title,
        description: route.description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        inLanguage: ['en', 'hi'],
      },
    ],
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'mw-seo-jsonld';
  script.textContent = JSON.stringify(base);
  document.head.appendChild(script);
}

export function updateSeoMeta(tab: string) {
  const route = ROUTE_SEO[tab] || ROUTE_SEO.home;
  const url = `${SITE_URL}${route.path === '/' ? '/' : route.path}`;
  const title = route.title;
  const description = route.description;
  const keywords = (route.keywords || []).join(', ');

  document.title = title;

  upsertMeta('name', 'description', description);
  if (keywords) upsertMeta('name', 'keywords', keywords);
  upsertLink('canonical', url);

  // Open Graph
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', LOGO_URL);
  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:locale', DEFAULT_LOCALE);

  // Twitter
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', LOGO_URL);
  upsertMeta('name', 'twitter:site', '@merawakeelai');

  updateJsonLd(tab);
}

export const localizedTagline = (language: Language) =>
  language === 'hi'
    ? 'न्याय अब हर नागरिक के हाथ में — मुफ्त AI कानूनी सहायता'
    : 'Mera Wakeel AI — Apna Personal Legal Guide, free AI legal help';