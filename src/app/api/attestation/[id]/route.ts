import { NextRequest, NextResponse } from "next/server";
import { getAttestation, getAllAttestations } from "@/lib/tee-engine";
import { verifyQuote } from "@/lib/verify-attestation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (id === "all") {
    return NextResponse.json(await getAllAttestations());
  }

  const attestation = await getAttestation(id);
  if (!attestation) {
    return NextResponse.json(
      { error: "Attestation not found" },
      { status: 404 }
    );
  }

  const shouldVerify = request.nextUrl.searchParams.get("verify") === "true";

  if (shouldVerify) {
    const verification = await verifyQuote(
      attestation.hardwareQuote,
      attestation.enclaveMode
    );
    return NextResponse.json({ ...attestation, verification });
  }

  return NextResponse.json(attestation);
}
