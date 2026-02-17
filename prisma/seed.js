require("dotenv").config();

const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("../generated/prisma");

//////////////////////////////////////////////////////
// PRISMA CONNECTION
//////////////////////////////////////////////////////
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

//////////////////////////////////////////////////////
// SEED FUNCTION
//////////////////////////////////////////////////////
async function main() {
  const permissions = [
    // CUSTOMER
    { module: "customer", action: "read" },
    { module: "customer", action: "create" },
    { module: "customer", action: "update" },
    { module: "customer", action: "delete" },

    // INVOICE
    { module: "invoice", action: "read" },
    { module: "invoice", action: "create" },
    { module: "invoice", action: "update" },
    { module: "invoice", action: "delete" },

    // USER
    { module: "user", action: "read" },
    { module: "user", action: "create" },
    { module: "user", action: "update" },
    { module: "user", action: "delete" },
  ];

  console.log("🌱 Seeding permissions...");

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: p.module,
          action: p.action,
        },
      },
      update: {},
      create: p,
    });
  }

  console.log("✅ Permission seeding completed");
}

//////////////////////////////////////////////////////
// RUN
//////////////////////////////////////////////////////
main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
