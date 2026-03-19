import { NextRequest, NextResponse } from "next/server";
import {
  executeTEE,
  executeInfoMarketTEE,
  getEnclavePublicKeyHex,
  getEnclaveStatus,
} from "@/lib/tee-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (mode === "info_market") {
      const { taskId, encryptedSecret, iv, buyerAccepted } = body;
      if (!taskId || !encryptedSecret || !iv) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      const attestation = await executeInfoMarketTEE({
        taskId,
        encryptedSecret,
        iv,
        buyerAccepted: !!buyerAccepted,
      });
      return NextResponse.json(attestation);
    }

    const { taskId, encryptedKey, strategy, iv } = body;
    if (!taskId || !encryptedKey || !strategy || !iv) {
      return NextResponse.json(
        { error: "Missing required fields: taskId, encryptedKey, strategy, iv" },
        { status: 400 }
      );
    }

    const attestation = await executeTEE({ taskId, encryptedKey, strategy, iv });
    return NextResponse.json(attestation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const enclaveKey = await getEnclavePublicKeyHex();
  const { mode } = await getEnclaveStatus();
  return NextResponse.json({ enclaveKey, enclaveMode: mode });
}
