import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';

// ==========================================
// 🚀 DAFTAR RUTE KHUSUS LANDING PAGE 
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
  
  // Suntikkan header khusus agar AuthProvider (di React) mengenali Zona Portal
  const requestHeaders = new Headers(request.headers);

  // ==========================================
  // LAPIS 2: STRATEGI SUB-DOMAIN (PRODUCTION)
  // ==========================================
  
  // A. ADMIN PORTAL
  if (hostname.includes('admin.flashglobalslogistik.com')) {
    requestHeaders.set('x-portal-zone', 'admin');
    if (url.pathname.startsWith('/admin')) {
      const cleanPath = url.pathname.replace(/^\/admin/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); 
    }
    return NextResponse.rewrite(new URL(`/admin${url.pathname}`, request.url), {
      request: { headers: requestHeaders }
    });
  } 
  
  // B. DRIVER PORTAL 
  else if (hostname.includes('driver.flashglobalslogistik.com')) {
    requestHeaders.set('x-portal-zone', 'driver');
    if (url.pathname.startsWith('/driver')) {
      const cleanPath = url.pathname.replace(/^\/driver/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); 
    }

    // [DIPERBAIKI]: Kembalikan pemisahan mobile/desktop agar tidak 404
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/driver/mobile${url.pathname}`, request.url), {
        request: { headers: requestHeaders }
      });
    } else {
      return NextResponse.rewrite(new URL(`/driver/desktop${url.pathname}`, request.url), {
        request: { headers: requestHeaders }
      });
    }
  } 
  
  // C. LANDING PAGE PORTAL
  else if (hostname === 'flashglobalslogistik.com' || hostname === 'www.flashglobalslogistik.com') {
    requestHeaders.set('x-portal-zone', 'landing');
    if (url.pathname.startsWith('/landing')) {
      const cleanPath = url.pathname.replace(/^\/landing/, '') || '/';
      url.pathname = cleanPath;
      return NextResponse.redirect(url); 
    }
    return NextResponse.rewrite(new URL(`/landing${url.pathname}`, request.url), {
      request: { headers: requestHeaders }
    });
  }
  
  // D. CLIENT PORTAL / TUAN RUMAH
  else if (hostname.includes('web.flashglobalslogistik.com')) {
    requestHeaders.set('x-portal-zone', 'client');
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/mobile${url.pathname}`, request.url), {
        request: { headers: requestHeaders }
      });
    } else {
      return NextResponse.rewrite(new URL(`/desktop${url.pathname}`, request.url), {
        request: { headers: requestHeaders }
      });
    }
  }

  // ==========================================
  // LAPIS 3: STRATEGI LOCALHOST (DEVELOPMENT)
  // ==========================================
  if (isLocalhost) {
    // 1. Admin normal di localhost
    if (url.pathname.startsWith('/admin')) {
      return NextResponse.next();
    }

    // 2. [DIPERBAIKI]: Driver butuh rewrite mobile/desktop di localhost
    if (url.pathname.startsWith('/driver')) {
      const driverPath = url.pathname.replace(/^\/driver/, '');
      if (isMobile) {
        return NextResponse.rewrite(new URL(`/driver/mobile${driverPath}`, request.url));
      } else {
        return NextResponse.rewrite(new URL(`/driver/desktop${driverPath}`, request.url));
      }
    }

    // 3. Fake Subdomain untuk Landing Page
    const isLandingRoute = LANDING_PAGE_ROUTES.some(route => 
      url.pathname === route || url.pathname.startsWith(`${route}/`)
    );
    if (isLandingRoute) {
      return NextResponse.rewrite(new URL(`/landing${url.pathname}`, request.url));
    }

    // 4. Default Tuan Rumah
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