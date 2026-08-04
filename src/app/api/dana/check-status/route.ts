// src/app/api/dana/check-status/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { generateSnapSignature, getDanaTimestamp } from '@/lib/utils';

// 🚀 IMPORT TIPE DARI FINANCE.TS
import { CheckStatusPayload, DanaSnapInquiryResponse } from '@/types/finance';

const DANA_BASE_URL = process.env.DANA_BASE_URL || 'https://api.sandbox.dana.id';
const CLIENT_ID = process.env.DANA_CLIENT_ID || '';
const PRIVATE_KEY = process.env.DANA_PRIVATE_KEY || '';

export async function POST(req: Request) {
  try {
    // 🚀 Cast payload ke Interface yang aman
    const body = (await req.json()) as Partial<CheckStatusPayload>;
    const { withdrawalId, driverId, amount } = body;

    if (!withdrawalId || !driverId || !amount) {
      return NextResponse.json({ success: false, message: "Data payload tidak lengkap" }, { status: 400 });
    }

    if (!CLIENT_ID || !PRIVATE_KEY || CLIENT_ID === "menunggu_wilson") {
      throw new Error("Sistem belum siap. Kredensial DANA belum dikonfigurasi.");
    }

    // 1. CEK STATUS TERAKHIR DI FIRESTORE
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const snap = await getDoc(withdrawalRef);
    
    if (!snap.exists()) {
      return NextResponse.json({ success: false, message: "Data pengajuan penarikan tidak ditemukan di database" }, { status: 404 });
    }

    const currentStatus = snap.data().status;
    
    // Jika ternyata sudah sukses/gagal di database, batalkan pengecekan agar tidak buang kuota API
    if (currentStatus === "Disetujui" || currentStatus === "Ditolak") {
      return NextResponse.json({ success: true, message: "Transaksi sudah berstatus final di database." });
    }

    // 2. TEMBAK API DANA: CUSTOMER TOP UP INQUIRY STATUS
    const timestamp = getDanaTimestamp();
    const externalId = crypto.randomUUID();

    const inquiryBody = {
      originalPartnerReferenceNo: withdrawalId, 
      serviceCode: "38" 
    };

    const endpointPath = '/rest/v1.0/emoney/topup-status';
    const signature = await generateSnapSignature('POST', endpointPath, inquiryBody, timestamp, PRIVATE_KEY);

    const danaRes = await fetch(`${DANA_BASE_URL}${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': CLIENT_ID,
        'X-EXTERNAL-ID': externalId,
        'CHANNEL-ID': '95221'
      },
      body: JSON.stringify(inquiryBody)
    });

    // 🚀 Cast response dari DANA ke Interface SNAP
    const danaData = (await danaRes.json()) as DanaSnapInquiryResponse;

    // Jika API Inquiry-nya sendiri yang error (misal Timeout/Too Many Requests)
    if (danaData.responseCode !== "2003900") {
      return NextResponse.json({ 
        success: false, 
        message: "API Pengecekan DANA sedang sibuk/gagal, status tetap ditahan.", 
        code: danaData.responseCode 
      }, { status: 500 });
    }

    // 3. LOGIKA PENJINAK STATUS (TRANSLATOR DANA -> FIRESTORE)
    const txStatus = danaData.latestTransactionStatus;
    
    if (txStatus === "00") {
      // 00 = TRANSAKSI TERNYATA SUKSES!
      await runTransaction(db, async (transaction) => {
        // Karena waktu statusnya "Processing" saldo kurir udah kita potong,
        // di sini kita CUMA PERLU merubah status request jadi "Disetujui" dan nulis Log
        transaction.update(withdrawalRef, { status: "Disetujui" });
        
        const logRef = doc(collection(db, 'wallet_logs'));
        transaction.set(logRef, {
          userId: driverId,
          amount: amount,
          type: 'deduction',
          description: `Pencairan via DANA (Resolved by System Inquiry)`,
          createdAt: serverTimestamp()
        });
      });

      return NextResponse.json({ success: true, message: "Status DANA: Sukses. Database telah diperbarui." });

    } else if (txStatus === "01" || txStatus === "02" || txStatus === "03") {
      // 01, 02, 03 = DARI SANANYA MASIH PENDING!
      return NextResponse.json({ success: true, message: "Status DANA: Masih diproses (Pending). Belum ada perubahan." });

    } else {
      // 04, 05, 06, 07 = TRANSAKSI GAGAL! KITA HARUS ROLLBACK SALDO KURIR
      const walletRef = doc(db, 'driver_wallets', driverId);

      await runTransaction(db, async (transaction) => {
        const walletDoc = await transaction.get(walletRef);
        const currentBalance = walletDoc.exists() ? walletDoc.data().balance : 0;
        
        // Kembalikan uang kurir (karena waktu berstatus "Processing" saldo sudah terlanjur dipotong)
        transaction.update(walletRef, { balance: currentBalance + amount });
        
        transaction.update(withdrawalRef, { 
          status: "Ditolak", 
          adminNotes: `Dibatalkan otomatis oleh sistem (Status DANA: ${txStatus})` 
        });
      });

      return NextResponse.json({ success: true, message: "Status DANA: Gagal/Batal. Uang telah dikembalikan ke dompet kurir." });
    }

  } catch (error: unknown) {
    console.error("Inquiry Status Error:", error);
    
    let errorMessage = "Terjadi kesalahan internal";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}