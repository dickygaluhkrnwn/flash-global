import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { device } = userAgent(request);
  
  // Dapatkan subdomain yang sedang dikunjungi user
  const hostname = request.headers.get('host') || '';

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

  // ==========================================
  // LAPIS 2: LOGIKA SUB-DOMAIN (SECURITY ROUTING)
  // ==========================================
  
  // A. ADMIN PORTAL (admin.flashglobalslogistik.com)
  if (hostname.includes('admin.flashglobalslogistik.com')) {
    // Jika ngetik URL kosong, paksa ke folder admin
    if (url.pathname === '/') {
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  } 
  // B. DRIVER PORTAL (driver.flashglobalslogistik.com)
  else if (hostname.includes('driver.flashglobalslogistik.com')) {
    // Jika ngetik URL kosong, paksa ke halaman login driver
    if (url.pathname === '/') {
      url.pathname = '/driver/login';
      return NextResponse.redirect(url);
    }
  } 
  // C. CLIENT PORTAL (web.flashglobalslogistik.com ATAU flashglobalslogistik.com)
  else if (hostname.includes('web.flashglobalslogistik.com') || hostname === 'flashglobalslogistik.com') {
    // PROTEKSI KETAT: Klien dilarang mengakses URL /admin atau /driver dari domain publik
    if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/driver')) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // ==========================================
  // LAPIS 3: LOGIKA DEVICE DETECTION (REWRITE)
  // ==========================================
  // Catatan: Lapis 3 ini hanya dieksekusi jika user lolos dari Lapis 2

  // Bypass folder admin dan reset password agar tidak di-rewrite ke mobile/desktop
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/reset-password')) {
    return NextResponse.next();
  }

  const isMobile = device.type === 'mobile';

  // LOGIC REWRITE UNTUK PORTAL DRIVER (Bagi jadi Mobile/Desktop)
  if (url.pathname.startsWith('/driver')) {
    const driverPath = url.pathname.replace(/^\/driver/, '');
    
    if (isMobile) {
      return NextResponse.rewrite(new URL(`/driver/mobile${driverPath}`, request.url));
    } else {
      // Jika butuh tampilan "Coming Soon" untuk Driver di Desktop
      return NextResponse.rewrite(new URL(`/driver/desktop${driverPath}`, request.url));
    }
  }

  // LOGIC REWRITE UNTUK PORTAL CLIENT (Bagi jadi Mobile/Desktop)
  if (isMobile) {
    return NextResponse.rewrite(new URL(`/mobile${url.pathname}`, request.url));
  } else {
    return NextResponse.rewrite(new URL(`/desktop${url.pathname}`, request.url));
  }
}

// Tentukan route mana saja yang harus melewati middleware ini
export const config = {
  matcher: [
    /*
     * Cocokkan semua path kecuali:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. semua file dengan ekstensi (misal: .jpg, .png, .favicon)
     */
    '/((?!api|_next|_static|[\\w-]+\\.\\w+).*)',
  ],
};