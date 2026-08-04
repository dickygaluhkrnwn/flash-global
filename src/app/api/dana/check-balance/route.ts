import { NextResponse } from 'next/server';
import { 
  getDanaTimestamp, 
  generateDanaMessageId, 
  generateOpenApiSignature 
} from '@/lib/utils';

// 🚀 IMPORT DARI FILE TYPE GLOBAL
import { DanaResourceInfo } from '@/types/finance';

const DANA_BASE_URL = process.env.DANA_BASE_URL || 'https://api.sandbox.dana.id';
const CLIENT_ID = process.env.DANA_CLIENT_ID || '';
const MERCHANT_ID = process.env.DANA_MERCHANT_ID || '';
const PRIVATE_KEY = process.env.DANA_PRIVATE_KEY || '';

export async function GET() {
  try {
    if (!CLIENT_ID || !MERCHANT_ID || !PRIVATE_KEY || CLIENT_ID === "menunggu_wilson") {
      throw new Error("Konfigurasi DANA bermasalah (Kredensial belum diset).");
    }

    const timestamp = getDanaTimestamp();
    const msgId = generateDanaMessageId();

    const requestData = {
      head: {
        version: "2.0",
        function: "dana.merchant.queryMerchantResource",
        clientId: CLIENT_ID,
        reqTime: timestamp,
        reqMsgId: msgId,
        reserve: "{}" 
      },
      body: {
        requestMerchantId: MERCHANT_ID,
        merchantResourceInfoList: ["MERCHANT_DEPOSIT_BALANCE"]
      }
    };

    const signature = await generateOpenApiSignature(requestData, PRIVATE_KEY);

    const finalPayload = {
      request: requestData,
      signature: signature
    };

    const endpointUrl = `${DANA_BASE_URL}/dana/merchant/queryMerchantResource`;
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload)
    });

    const data = await response.json();
    const responseBody = data?.response?.body;
    
    if (!responseBody || !responseBody.resultInfo) {
      throw new Error("Format respons dari sistem DANA tidak dikenali.");
    }

    const { resultStatus, resultMsg } = responseBody.resultInfo;

    if (resultStatus === 'U') {
      throw new Error("Sistem DANA sedang sibuk atau mengalami timeout.");
    } 
    else if (resultStatus === 'F') {
      throw new Error(`Konfigurasi DANA bermasalah / Gagal: ${resultMsg}`);
    } 
    else if (resultStatus === 'S') {
      // 🚀 PAKAI INTERFACE DARI finance.ts
      const resourceList: DanaResourceInfo[] = responseBody.merchantResourceInfoList || [];
      const depositData = resourceList.find((res) => res.type === "MERCHANT_DEPOSIT_BALANCE");

      if (!depositData || !depositData.value) {
        throw new Error("Data saldo tidak ditemukan dalam akun merchant DANA Anda.");
      }

      const parsedValue = JSON.parse(depositData.value);
      const balanceStr = parsedValue.amount?.value || "0";
      const balanceNumber = parseFloat(balanceStr);

      return NextResponse.json({ 
        success: true, 
        balance: balanceNumber,
        currency: parsedValue.amount?.currency || 'IDR'
      });
    } 
    else {
      throw new Error("Sistem DANA merespons dengan status yang tidak diketahui.");
    }

  } catch (error: unknown) {
    console.error("DANA Check Balance Error:", error);
    
    let errorMessage = "Terjadi kesalahan internal.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 400 }
    );
  }
}