//////////////////////////////////////////////////////
// LOAD ENV VARIABLES (VERY IMPORTANT)
//////////////////////////////////////////////////////
require("dotenv").config();

//////////////////////////////////////////////////////
// IMPORT YOUR PRISMA INSTANCE
//////////////////////////////////////////////////////
const prisma = require("../src/config/prisma");

//////////////////////////////////////////////////////
// SEED FUNCTION
//////////////////////////////////////////////////////
async function main() {
  console.log("🌱 Seeding Modules & Permissions...");

  //////////////////////////////////////////////////////
  // MODULE DEFINITIONS
  //////////////////////////////////////////////////////
  const modules = [
    {
      name: "invoice",
      actions: ["create", "read", "update", "delete"],
    },
    {
      name: "customer",
      actions: ["create", "read", "update", "delete"],
    },
    {
      name: "settings",
      actions: ["create", "update"],
    },
    {
        name: "payment",
        actions: ["create", "read"],
    }
  ];

  //////////////////////////////////////////////////////
  // CREATE MODULES + PERMISSIONS
  //////////////////////////////////////////////////////
  for (const item of modules) {
    ////////////////////////////////////////////////
    // CREATE MODULE
    ////////////////////////////////////////////////
    const moduleRecord = await prisma.module.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
      },
    });

    console.log(`✅ Module created: ${item.name}`);

    ////////////////////////////////////////////////
    // CREATE PERMISSIONS
    ////////////////////////////////////////////////
    for (const action of item.actions) {
      await prisma.permission.upsert({
        where: {
          moduleId_action: {
            moduleId: moduleRecord.id,
            action,
          },
        },
        update: {},
        create: {
          moduleId: moduleRecord.id,
          action,
        },
      });

      console.log(`   ↳ Permission added: ${action}`);
    }
  }

  console.log("🎉 Modules & Permissions Seeded Successfully!");
}

//////////////////////////////////////////////////////
// RUN SEED
//////////////////////////////////////////////////////
main()
  .catch((error) => {
    console.error("❌ Seed Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });