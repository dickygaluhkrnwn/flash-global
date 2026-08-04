import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { 
  getDanaTimestamp, 
  generateSnapSignature, 
  formatDanaPhone, 
  formatDanaAmount 
} from '@/lib/utils';

// 🚀 IMPORT TYPE DARI FILE FINANCE
import { DanaTopupResponse } from '@/types/finance';

const DANA_BASE_URL = process.env.DANA_BASE_URL || 'https://api.sandbox.dana.id';
const CLIENT_ID = process.env.DANA_CLIENT_ID || '';
const PRIVATE_KEY = process.env.DANA_PRIVATE_KEY || '';
const DANA_ADMIN_FEE = 2000; 

// Helper untuk Jeda Waktu (Sleep)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { withdrawalId, driverId, amount, driverPhone } = body;

    if (!withdrawalId || !driverId || !amount || !driverPhone) {
      return NextResponse.json({ success: false, message: "Payload tidak lengkap" }, { status: 400 });
    }

    if (amount <= DANA_ADMIN_FEE) {
      return NextResponse.json(
        { success: false, message: `Nominal harus lebih besar dari biaya admin (Rp ${DANA_ADMIN_FEE})` }, 
        { status: 400 }
      );
    }

    // 1. FORMATTING STANDAR DANA
    const transferAmount = amount - DANA_ADMIN_FEE;
    const formattedTransferAmount = formatDanaAmount(transferAmount); 
    const formattedFeeAmount = formatDanaAmount(DANA_ADMIN_FEE);      
    const formattedPhone = formatDanaPhone(driverPhone);              

    const endpointPath = '/rest/v1.0/emoney/topup';
    
    // =======================================================================
    // 2. IMPLEMENTASI IDEMPOTENCY & RETRY JOB (Maksimal 3x untuk cegah Serverless Timeout)
    // =======================================================================
    const retryDelays = [3000, 5000, 10000]; // 3s, 5s, 10s
    
    // 🚀 PERBAIKAN: HAPUS ANY, GUNAKAN INTERFACE DARI FINANCE
    let finalDanaResponse: DanaTopupResponse | null = null;
    let finalResponseCode = "";

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      // Waktu dan External ID di-generate baru per request, TAPI partnerReferenceNo TETAP ABSOLUT SAMA
      const timestamp = getDanaTimestamp();
      const externalId = crypto.randomUUID(); 

      const topupBody = {
        partnerReferenceNo: withdrawalId, // ID Firestore (Idempotency Key Absolut)
        customerNumber: formattedPhone,
        amount: { value: formattedTransferAmount, currency: "IDR" },
        feeAmount: { value: formattedFeeAmount, currency: "IDR" },
        additionalInfo: { fundType: "AGENT_TOPUP_FOR_USER_SETTLE" }
      };

      const signature = await generateSnapSignature('POST', endpointPath, topupBody, timestamp, PRIVATE_KEY);

      const response = await fetch(`${DANA_BASE_URL}${endpointPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TIMESTAMP': timestamp,
          'X-SIGNATURE': signature,
          'X-PARTNER-ID': CLIENT_ID,
          'X-EXTERNAL-ID': externalId,
          'CHANNEL-ID': '95221'
        },
        body: JSON.stringify(topupBody)
      });

      // 🚀 CASTING RESPONSE KE INTERFACE KITA
      finalDanaResponse = (await response.json()) as DanaTopupResponse;
      finalResponseCode = finalDanaResponse.responseCode;

      // Jika Sukses (2003800) atau Error Pasti (4xx), STOP Looping!
      if (finalResponseCode === "2003800" || finalResponseCode.startsWith("4")) {
        break; 
      }

      // Jika Timeout / Server Error (5xx), tunggu dan ulangi (Jika jatah retry masih ada)
      if (attempt < retryDelays.length) {
        console.warn(`DANA Timeout/Error (${finalResponseCode}). Retrying in ${retryDelays[attempt]}ms...`);
        await sleep(retryDelays[attempt]);
      }
    }

    // =======================================================================
    // 3. DATABASE TRANSACTION (FIRESTORE)
    // =======================================================================
    const walletRef = doc(db, 'driver_wallets', driverId);
    const withdrawalRef = doc(db, 'withdrawal_requests', withdrawalId);
    const logRef = doc(collection(db, "wallet_logs"));

    await runTransaction(db, async (transaction) => {
      // A. Baca saldo terbaru
      const walletSnap = await transaction.get(walletRef);
      if (!walletSnap.exists()) throw new Error("Dompet Kurir tidak ditemukan");
      
      const currentBalance = walletSnap.data().balance || 0;
      
      // B. Eksekusi Berdasarkan Hasil Akhir DANA
      if (finalResponseCode === "2003800") {
        // SKENARIO 1: SUKSES (Uang Masuk DANA)
        if (currentBalance < amount) throw new Error("Saldo kurir tidak mencukupi saat transaksi dieksekusi");
        
        transaction.update(walletRef, { balance: currentBalance - amount });
        transaction.update(withdrawalRef, { status: "Disetujui" });
        
        transaction.set(logRef, {
          userId: driverId,
          type: "deduction",
          amount: amount,
          description: `Pencairan ke DANA (Fee Admin Rp${DANA_ADMIN_FEE})`,
          createdAt: serverTimestamp()
        });

      } else if (finalResponseCode.startsWith("5") || finalResponseCode === "4293800") {
        // SKENARIO 2: PENDING / TIMEOUT PARAH SETELAH DI-RETRY
        // Saldo TETAP DIPOTONG (dikunci) agar kurir tidak double-withdraw, status jadi Processing
        if (currentBalance < amount) throw new Error("Saldo kurir tidak mencukupi saat mengunci transaksi");

        transaction.update(walletRef, { balance: currentBalance - amount });
        transaction.update(withdrawalRef, { status: "Processing" }); // Menunggu fitur Check Status Admin

        transaction.set(logRef, {
          userId: driverId,
          type: "deduction",
          amount: amount,
          description: `Pencairan Ditahan/Processing sistem DANA`,
          createdAt: serverTimestamp()
        });

      } else {
        // SKENARIO 3: FAILED (Ditolak DANA, misal Akun Invalid)
        // Saldo JANGAN dipotong (Rollback), status jadi Ditolak
        transaction.update(withdrawalRef, { 
          status: "Ditolak", 
          adminNotes: `Ditolak Sistem DANA: ${finalDanaResponse?.responseMessage || 'Error'}` 
        });
      }
    });

    // =======================================================================
    // 4. RESPONSE KE FRONTEND (UI ADMIN)
    // =======================================================================
    if (finalResponseCode === "2003800") {
      return NextResponse.json({ success: true, message: "Pencairan DANA Sukses!" });
    } else if (finalResponseCode.startsWith("5") || finalResponseCode === "4293800") {
      return NextResponse.json({ success: true, message: "Transaksi Pending di DANA. Status menjadi Processing." });
    } else {
      return NextResponse.json(
        { success: false, message: `Gagal DANA: ${finalDanaResponse?.responseMessage || 'Unknown'}` }, 
        { status: 400 }
      );
    }

  // 🚀 PERBAIKAN: ANY MENJADI UNKNOWN
  } catch (error: unknown) {
    console.error("DANA Top Up Transaction Error:", error);
    
    let errorMessage = "Terjadi kesalahan internal";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, message: errorMessage }, 
      { status: 500 }
    );
  }
}