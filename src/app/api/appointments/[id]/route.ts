import { NextResponse } from "next/server";
import { validateAppointmentStatus } from "@/lib/appointmentValidation";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Deployment blocker: require shop-scoped authentication before production.
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求 JSON 格式无效" }, { status: 400 });
  }

  const validation = validateAppointmentStatus(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "预约不存在" }, { status: 404 });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: validation.data },
      include: { quote: true },
    });

    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Failed to update appointment", error);
    return NextResponse.json({ error: "更新预约失败" }, { status: 500 });
  }
}
