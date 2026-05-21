import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized Identity Parameter Context." }, { status: 401 });
  }

  try {
    const { name, image } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Identification string field parameters cannot be empty." }, { status: 400 });
    }

    // Dynamic execution update pass adapting both name transformations and uploaded asset image fields
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        name: name.trim(),
        image: image || null // Saves Google link or Cloudinary upload path cleanly
      },
      select: { name: true, image: true }
    });

    return NextResponse.json({ success: true, name: updatedUser.name, image: updatedUser.image });
  } catch (err) {
    console.error("User Profile Update Fault:", err);
    return NextResponse.json({ error: "Failed to apply profile changes to database context." }, { status: 500 });
  }
}