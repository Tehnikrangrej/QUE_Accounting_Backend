//////////////////////////////////////////////////////
// DATABASE MIGRATION SCRIPT
// Migrate existing users to include role field
//////////////////////////////////////////////////////

const prisma = require("../src/config/prisma");
const bcrypt = require("bcryptjs");

const migrateUsers = async () => {
  try {
    console.log("🔄 Starting user migration...");

    // Check if role column exists
    try {
      await prisma.user.findFirst({
        select: { role: true }
      });
      console.log("✅ Role column already exists. Skipping migration.");
      return;
    } catch (error) {
      console.log("📝 Role column doesn't exist. Running migration...");
    }

    // Get all existing users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`📊 Found ${users.length} users to migrate`);

    // Determine super admin from environment
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    
    // Prepare migration data
    const migrationData = users.map(user => {
      let role = 'USER';
      
      // Set super admin role based on environment variable
      if (superAdminEmail && user.email === superAdminEmail) {
        role = 'SUPER_ADMIN';
        console.log(`👑 Setting SUPER_ADMIN role for: ${user.email}`);
      }
      
      return {
        id: user.id,
        role,
      };
    });

    // Update users with roles (this would typically be done via Prisma migration)
    // For now, we'll use a raw SQL approach if needed
    console.log("🔄 Updating user roles...");
    
    // Note: In production, you should use Prisma migrations
    // This is just for demonstration
    for (const userData of migrationData) {
      await prisma.user.update({
        where: { id: userData.id },
        data: { role: userData.role },
      });
    }

    console.log("✅ Migration completed successfully!");
    
    // Verify migration
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' }
    });
    
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });
    
    const userCount = await prisma.user.count({
      where: { role: 'USER' }
    });

    console.log(`📊 Migration Summary:`);
    console.log(`   Super Admins: ${superAdminCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Users: ${userCount}`);

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

// Create a super admin user if none exists
const createSuperAdmin = async () => {
  try {
    console.log("🔐 Checking for super admin user...");

    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' }
    });

    if (existingSuperAdmin) {
      console.log("✅ Super admin user already exists.");
      return;
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "admin123";

    if (!superAdminEmail) {
      console.log("⚠️  SUPER_ADMIN_EMAIL not set. Skipping super admin creation.");
      return;
    }

    console.log(`👑 Creating super admin user: ${superAdminEmail}`);

    const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

    const superAdmin = await prisma.user.create({
      data: {
        name: "Super Admin",
        email: superAdminEmail,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("✅ Super admin user created successfully!");
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🔑 Password: ${superAdminPassword}`);
    console.log("⚠️  Please change the password after first login!");

  } catch (error) {
    console.error("❌ Failed to create super admin:", error);
    throw error;
  }
};

// Main migration function
const runMigration = async () => {
  try {
    console.log("🚀 Starting database migration...");
    
    // Run migrations
    await migrateUsers();
    await createSuperAdmin();
    
    console.log("✅ All migrations completed successfully!");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  migrateUsers,
  createSuperAdmin,
  runMigration,
};
