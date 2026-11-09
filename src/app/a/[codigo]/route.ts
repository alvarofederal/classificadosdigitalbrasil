// APRESENTAÇÃO — link curto do anúncio (feature 005: RF-72): /a/9TTTMQ → /anuncio/9TTTMQ.

import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
  return NextResponse.redirect(new URL(`/anuncio/${codigo}`, request.url), 308)
}
