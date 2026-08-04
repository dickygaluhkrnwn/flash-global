import { NextResponse } from 'next/server';
import { 
  getDanaTimestamp, 
  generateSnapSignature, 
  formatDanaPhone, 
  formatDanaAmount 
} from '@/lib/utils';

// 🚀 IMPORT TYPE DARI FILE FINANCE
import { DanaInquiryPayload, DanaInquiryResponse } from '@/types/finance';

// Konfigurasi Environment DANA
const DANA_BASE_URL = process.env.DANA_BASE_URL || 'https://api.sandbox.dana.id';
const CLIENT_ID = process.env.DANA_CLIENT_ID || '';
const PRIVATE_KEY = process.env.DANA_PRIVATE_KEY || '';

export async function POST(req: Request) {
  try {
    // 1. Tangkap parameter dari Client (Frontend) - Type Safe Casting
    const body = (await req.json()) as Partial<DanaInquiryPayload>;
    const { partnerReferenceNo, customerNumber, amount } = body;

    // Validasi input dasar
    if (!partnerReferenceNo || !customerNumber || !amount) {
      return NextResponse.json(
        { success: false, message: "Data payload tidak lengkap (Butuh reference, nomor, dan amount)" }, 
        { status: 400 }
      );
    }

    if (!CLIENT_ID || !PRIVATE_KEY || CLIENT_ID === "menunggu_wilson") {
      throw new Error("Sistem belum siap. Kredensial DANA belum dikonfigurasi.");
    }

    // 2. Format Data sesuai standar SNAP API DANA
    const formattedPhone = formatDanaPhone(customerNumber);
    const formattedAmount = formatDanaAmount(amount);
    const timestamp = getDanaTimestamp();
    const externalId = crypto.randomUUID(); // X-EXTERNAL-ID harus unik per request

    // 3. Susun Body Request Account Inquiry
    const inquiryBody = {
      partnerReferenceNo: partnerReferenceNo,
      customerNumber: formattedPhone,
      amount: { 
        value: formattedAmount, 
        currency: "IDR" 
      },
      transactionDate: timestamp,
      additionalInfo: { 
        fundType: "AGENT_TOPUP_FOR_USER_SETTLE" 
      }
    };

    // 4. Generate Signature (Standar SNAP DANA B2B2C)
    const endpointPath = '/rest/v1.0/emoney/account-inquiry';
    const signature = await generateSnapSignature(
      'POST', 
      endpointPath, 
      inquiryBody, 
      timestamp, 
      PRIVATE_KEY
    );

    // 5. Tembak API DANA Inquiry
    const response = await fetch(`${DANA_BASE_URL}${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': CLIENT_ID,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': '95221' // ID Channel standar Disbursement DANA
      },
      body: JSON.stringify(inquiryBody)
    });

    // 🚀 CASTING RESPONSE KE INTERFACE DANA
    const data = (await response.json()) as DanaInquiryResponse;
    const responseCode = data.responseCode;

    // ==========================================
    // 6. LOGIC PARSING & ERROR HANDLING DANA
    // ==========================================
    
    // SKENARIO SUKSES (Nama Ditemukan)
    if (responseCode === "2003700") {
      return NextResponse.json({ 
        success: true, 
        customerName: data.customerName || data.additionalInfo?.customerName || "Pengguna DANA",
        message: "Akun valid."
      });
    } 
    
    // SKENARIO GAGAL (Nomor Tidak Ada)
    else if (responseCode === "4043711") {
      return NextResponse.json(
        { success: false, message: "Nomor DANA tidak ditemukan. Harap periksa kembali." },
        { status: 404 }
      );
    } 
    
    // SKENARIO GAGAL (Limit Penuh)
    else if (responseCode === "4033702") {
      return NextResponse.json(
        { success: false, message: "Akun DANA tujuan melebihi limit saldo/transaksi bulanan." },
        { status: 403 }
      );
    } 
    
    // SKENARIO PENDING / TIMEOUT / SYSTEM ERROR
    // Kode 5xx atau status yang menggantung
    else if (responseCode.startsWith("5") || responseCode === "4293800") {
      return NextResponse.json(
        { 
          success: false, 
          isTimeout: true, // Flag khusus untuk memicu UI me-retry
          message: "Sistem DANA sedang sibuk. Silakan coba sesaat lagi.",
          code: responseCode 
        }, 
        { status: 503 } // Service Unavailable
      );
    } 
    
    // SKENARIO ERROR LAINNYA (Misal Invalid Signature)
    else {
      return NextResponse.json(
        { success: false, message: data.responseMessage || "Gagal memverifikasi akun DANA", code: responseCode },
        { status: 400 }
      );
    }

  // 🚀 UBAH 'any' MENJADI 'unknown'
  } catch (error: unknown) {
    console.error("DANA Inquiry API Error:", error);
    
    let errorMessage = "Terjadi kesalahan internal pada server.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, message: errorMessage }, 
      { status: 500 }
    );
  }
}