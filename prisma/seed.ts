import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const dbPath = process.env.CARMOD_DB_PATH ?? path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const shop = await prisma.shop.upsert({
    where: { slug: "demo-shop" },
    update: {},
    create: {
      slug: "demo-shop",
      name: "极速贴膜 · 改装工坊",
      address: "上海市浦东新区张江路 888 号",
      phone: "021-8888-6666",
      openHours: "09:00-18:00",
    },
  });

  console.log("Seeded shop:", shop.name);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
