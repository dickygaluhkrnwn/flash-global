import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';

// ==========================================
// 🚀 DAFTAR RUTE KHUSUS LANDING PAGE 
// (Hanya berguna untuk Localhost saat development)
// ==========================================
const LANDING_PAGE_ROUTES = [
  '/solutions', '/solutions/personal', '/solutions/enterprise', '/solutions/ecommerce',
  '/partners', '/partners/driver', '/partners/fleet-vendor',
  '/features', '/features/live-tracking', '/features/flash-wallet', '/features/protection',
  '/resources', '/help-center', '/developer-api', '/blog',
  '/company', '/about', '/careers', '/contact'
];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { device } = userAgent(request);
  
  // Dapatkan subdomain yang sedang dikunjungi user
  const hostname = request.headers.get('host') || '';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // ==========================================
  // LAPIS 1: BYPASS FILE STATIS & INTERNAL
  // ==========================================
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isMobile = device.type === 'mobile';

  // ==========================================
  // LAPIS 2: STRATEGI SUB-DOMAIN (PRODUCTION)
  // Menjamin folder fisik (admin/driver/landing) tidak pernah bocor ke URL
  // ==========================================
  
  // A. ADMIN PORTAL (admin.flashglobalslogistik.com)
  if (hostname.includes('admin.flashglobalslogistik.com')) {
    // 1. Pembersih URL (Jika ada yang nyasar ngetik admin.flash.../admin/finance)
    if (url.pathname.startsWith('/admin')) {
      const cleanPath = url.pathname.replace(/^\/admin/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); // Bersihkan URL browser
    }
    
    // 2. Rewrite Diam-diam (Browser tetap /finance, tapi ambil file dari /admin/finance)
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, request.url));
  } 
  
  // B. DRIVER PORTAL (driver.flashglobalslogistik.com)
  else if (hostname.includes('driver.flashglobalslogistik.com')) {
    // 1. Pembersih URL (Jika ada yang nyasar ngetik driver.flash.../driver/dashboard)
    if (url.pathname.startsWith('/driver')) {
      const cleanPath = url.pathname.replace(/^\/driver/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); // Bersihkan URL browser
    }

    // 2. Rewrite Diam-diam (Ditambah logika pemisahan Mobile/Desktop)
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/driver/mobile${url.pathname}`, request.url));
    } else {
      return NextResponse.rewrite(new URL(`/driver/desktop${url.pathname}`, request.url));
    }
  } 
  
  // C. LANDING PAGE PORTAL (flashglobalslogistik.com)
  else if (hostname === 'flashglobalslogistik.com' || hostname === 'www.flashglobalslogistik.com') {
    // 1. Pembersih URL (Jika ada yang nyasar ngetik flash.../landing/about)
    if (url.pathname.startsWith('/landing')) {
      const cleanPath = url.pathname.replace(/^\/landing/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); // Bersihkan URL browser
    }

    // 2. Rewrite Diam-diam
    return NextResponse.rewrite(new URL(`/landing${url.pathname}`, request.url));
  }
  
  // D. CLIENT PORTAL / TUAN RUMAH (web.flashglobalslogistik.com)
  else if (hostname.includes('web.flashglobalslogistik.com')) {
    // Tuan rumah tidak butuh pembersih folder numpang, langsung bagi mobile/desktop
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/mobile${url.pathname}`, request.url));
    } else {
      return NextResponse.rewrite(new URL(`/desktop${url.pathname}`, request.url));
    }
  }

  // ==========================================
  // LAPIS 3: STRATEGI LOCALHOST (DEVELOPMENT)
  // Menjaga kenyamanan ngoding di komputer lokal
  // ==========================================
  if (isLocalhost) {
    // 1. Bypass akses eksplisit (Kalau kamu ngetik localhost:3000/admin)
    if (
      url.pathname.startsWith('/admin') || 
      url.pathname.startsWith('/landing') || 
      url.pathname.startsWith('/reset-password')
    ) {
      return NextResponse.next();
    }

    // 2. Routing spesifik Driver di Localhost
    if (url.pathname.startsWith('/driver')) {
      const driverPath = url.pathname.replace(/^\/driver/, '');
      if (isMobile) {
        return NextResponse.rewrite(new URL(`/driver/mobile${driverPath}`, request.url));
      } else {
        return NextResponse.rewrite(new URL(`/driver/desktop${driverPath}`, request.url));
      }
    }

    // 3. Fake Subdomain untuk Landing Page (Deteksi dari array LANDING_PAGE_ROUTES)
    const isLandingRoute = LANDING_PAGE_ROUTES.some(route => 
      url.pathname === route || url.pathname.startsWith(`${route}/`)
    );
    if (isLandingRoute) {
      return NextResponse.rewrite(new URL(`/landing${url.pathname}`, request.url));
    }

    // 4. Default: Lari ke Client Portal (Tuan Rumah)
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/mobile${url.pathname}`, request.url));
    } else {
      return NextResponse.rewrite(new URL(`/desktop${url.pathname}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|_static|[\\w-]+\\.\\w+).*)',
  ],
};