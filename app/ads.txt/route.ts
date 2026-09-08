import { NextResponse } from "next/server";

// Tells Google (and other ad networks crawling this file) that this
// AdSense publisher ID is authorized to sell ad inventory on this domain.
export async function GET() {
  const content = "google.com, pub-4227084691988266, DIRECT, f08c47fec0942fa0";
  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
