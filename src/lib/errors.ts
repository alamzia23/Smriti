import { NextResponse } from "next/server";

// Generic, non-leaking responses. Details are logged server-side by callers;
// clients only ever see a short message + status.
export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}
