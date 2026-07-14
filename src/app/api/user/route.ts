import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPin, verifyPin, isValidName, isValidPin } from "@/lib/pin";

// POST /api/user
// Body: { name: string, pin: "1234" }
// Finds an existing user matching (name, PIN) or creates a new one, and returns
// { userId, name }. This is a lightweight identity (not real auth) so data can
// follow a person across devices without accounts.
export async function POST(req: NextRequest) {
  let body: { name?: unknown; pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : body.name;
  const pin = body.pin;

  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "กรุณากรอกชื่อ (1–40 ตัวอักษร)" },
      { status: 400 }
    );
  }
  if (!isValidPin(pin)) {
    return NextResponse.json(
      { error: "PIN ต้องเป็นตัวเลข 4 หลัก" },
      { status: 400 }
    );
  }

  try {
    // A display name can be shared by several people, told apart by PIN.
    // Find any existing user with this name whose PIN matches.
    const candidates = await prisma.user.findMany({ where: { name } });
    const match = candidates.find((u) => verifyPin(pin, u.pinHash));

    if (match) {
      return NextResponse.json({ userId: match.id, name: match.name, created: false });
    }

    // No match — create a new user with this name + PIN.
    const created = await prisma.user.create({
      data: { name, pinHash: hashPin(pin) },
      select: { id: true, name: true },
    });
    return NextResponse.json({ userId: created.id, name: created.name, created: true });
  } catch (err) {
    console.error("POST /api/user failed:", err);
    return NextResponse.json(
      { error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
