import { NextResponse, userAgent } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const { device } = userAgent(request);

  // Abaikan request untuk file statis, API, file internal Next.js, dan PORTAL ADMIN
  // Biar middleware nggak berjalan berkali-kali atau memblokir akses Admin
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.startsWith('/admin') || // <-- JALUR VIP: BYPASS FOLDER ADMIN
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Deteksi apakah perangkat yang digunakan adalah mobile (HP)
  const isMobile = device.type === 'mobile';

  // LOGIC REWRITE: Arahkan secara internal tanpa merubah URL di browser
  if (isMobile) {
    // Jika user buka dari HP, arahkan ke folder src/app/mobile
    return NextResponse.rewrite(new URL(`/mobile${url.pathname}`, request.url));
  } else {
    // Jika user buka dari Laptop/Tablet, arahkan ke folder src/app/desktop
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