require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ 
  connectionString,
  ssl: true,
  max: 1,
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const permissions = [
    { module: "customer", action: "read" },
    { module: "customer", action: "create" },
    { module: "customer", action: "update" },
    { module: "customer", action: "delete" },
    { module: "invoice", action: "read" },
    { module: "invoice", action: "create" },
    { module: "invoice", action: "update" },
    { module: "invoice", action: "delete" },
    { module: "user", action: "read" },
    { module: "user", action: "create" },
    { module: "user", action: "update" },
    { module: "user", action: "delete" },
  ];

  console.log("Seeding permissions...");

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { module_action: { module: p.module, action: p.action } },
      update: {},
      create: p,
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
