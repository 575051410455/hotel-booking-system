import { db } from "../db";
import * as schema from "../db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users with different roles
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const existingAdmin = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, "admin@hotel.com"),
  });

  if (!existingAdmin) {
    await db.insert(schema.users).values([
      {
        email: "admin@hotel.com",
        password: hashedPassword,
        fullName: "System Administrator",
        role: "admin",
        department: "IT",
        phone: "0812345678",
        isActive: true,
      },
      {
        email: "manager@hotel.com",
        password: await bcrypt.hash("manager123", 10),
        fullName: "Hotel Manager",
        role: "manager",
        department: "Management",
        phone: "0823456789",
        isActive: true,
      },
      {
        email: "sales@hotel.com",
        password: await bcrypt.hash("sales123", 10),
        fullName: "Sales Staff",
        role: "sales",
        department: "Sales",
        phone: "0834567890",
        isActive: true,
      },
      {
        email: "coordinator@hotel.com",
        password: await bcrypt.hash("coord123", 10),
        fullName: "Sales Coordinator",
        role: "salescoordinator",
        department: "Sales",
        phone: "0845678901",
        isActive: true,
      },
      {
        email: "frontoffice@hotel.com",
        password: await bcrypt.hash("front123", 10),
        fullName: "Front Office Staff",
        role: "frontoffice",
        department: "Front Office",
        phone: "0856789012",
        isActive: true,
      },
      {
        email: "housekeeping@hotel.com",
        password: await bcrypt.hash("house123", 10),
        fullName: "Housekeeping Staff",
        role: "housekeeping",
        department: "Housekeeping",
        phone: "0867890123",
        isActive: true,
      },
    ]);
    console.log("✅ Created default users");
  } else {
    console.log("⏭️  Admin user already exists, skipping seed");
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
