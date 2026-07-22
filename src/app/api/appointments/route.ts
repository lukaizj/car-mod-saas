import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateAppointmentInput } from "@/lib/appointmentValidation";
import { calculateQuote } from "@/lib/pricing";

const DEFAULT_SHOP_SLUG = "demo-shop";

async function getDemoShop() {
  return prisma.shop.findUnique({ where: { slug: DEFAULT_SHOP_SLUG } });
}

export async function GET() {
  // Deployment blocker: require shop-scoped authentication before production.
  try {
    const shop = await getDemoShop();
    if (!shop) {
      return NextResponse.json({ error: "门店未初始化" }, { status: 500 });
    }

    const appointments = await prisma.appointment.findMany({
      where: { shopId: shop.id },
      include: { quote: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(appointments);
  } catch (error) {
    console.error("Failed to list appointments", error);
    return NextResponse.json({ error: "读取预约失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求 JSON 格式无效" }, { status: 400 });
  }

  const validation = validateAppointmentInput(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { config, customer, phone, date, timeSlot, note } = validation.data;

  try {
    const shop = await getDemoShop();
    if (!shop) {
      return NextResponse.json({ error: "门店未初始化" }, { status: 500 });
    }

    const quoteResult = calculateQuote(config);
    const appointment = await prisma.$transaction(async (transaction) => {
      const quote = await transaction.quote.create({
        data: {
          shopId: shop.id,
          config: JSON.stringify(config),
          breakdown: JSON.stringify(quoteResult.lines),
          total: quoteResult.total,
          customer,
          phone,
          status: "submitted",
        },
      });

      return transaction.appointment.create({
        data: {
          shopId: shop.id,
          quoteId: quote.id,
          date,
          timeSlot,
          customer,
          phone,
          note,
          status: "pending",
        },
        include: { quote: true },
      });
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error("Failed to create appointment", error);
    return NextResponse.json({ error: "创建预约失败" }, { status: 500 });
  }
}
