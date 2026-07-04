import "dotenv/config";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { dbConfig } from "../src/config/db.config.js";
import { UserModel, type UserRole } from "../src/models/user.model.js";

type SeedCred = {
  role: UserRole;
  fullName: string;
  email: string;
  password: string;
  mobile: string;
  aadhaarFull: string;
};

const roles: UserRole[] = ["admin", "farmer", "taluk_admin", "delivery", "consumer"];

function buildCred(role: UserRole, roleIndex: number, index: number): SeedCred {
  const shortRole = role.replace("_", "");
  const suffix = `${roleIndex}${index}`;
  const base = 71000000 + roleIndex * 100 + index;
  const mobile = `9${String(base).slice(0, 9)}`.slice(0, 10);
  const aadhaarFull = `93${String(1000000000 + roleIndex * 100 + index).slice(0, 10)}`.slice(0, 12);

  return {
    role,
    fullName: `${role.toUpperCase()} User ${index}`,
    email: `${shortRole}${index}.seed@pasumaicholai.local`,
    password: `${shortRole}@12345`,
    mobile,
    aadhaarFull,
  };
}

async function seedOne(cred: SeedCred): Promise<void> {
  const passwordHash = await bcrypt.hash(cred.password, 12);
  await UserModel.updateOne(
    { email: cred.email },
    {
      $set: {
        fullName: cred.fullName,
        email: cred.email,
        mobile: cred.mobile,
        phone: cred.mobile,
        dob: "1995-01-01",
        gender: "male",
        passwordHash,
        aadhaarFull: cred.aadhaarFull,
        aadhaarLast4: cred.aadhaarFull.slice(-4),
        role: cred.role,
        house: "Seed House",
        street: "Seed Street",
        city: "Chennai",
        district: "Chennai",
        talukName: cred.role === "taluk_admin" ? "Chennai Taluk" : undefined,
        wardId: cred.role === "taluk_admin" ? "WARD-01" : undefined,
        wardName: cred.role === "taluk_admin" ? "Ward 01" : undefined,
        assignedWardId: cred.role === "taluk_admin" ? "WARD-01" : undefined,
        assignedWardName: cred.role === "taluk_admin" ? "Ward 01" : undefined,
        state: "Tamil Nadu",
        pincode: "600001",
      },
    },
    { upsert: true },
  );
}

async function main(): Promise<void> {
  await mongoose.connect(dbConfig.uri, { dbName: dbConfig.dbName });

  const creds: SeedCred[] = [];
  for (let r = 0; r < roles.length; r += 1) {
    for (let i = 1; i <= 2; i += 1) {
      creds.push(buildCred(roles[r]!, r + 1, i));
    }
  }

  for (const cred of creds) {
    await seedOne(cred);
  }

  const outPath = path.join(process.cwd(), "..", "seeded-login-creds.txt");
  const lines = [
    "PASUMAI CHOLAI SEEDED LOGIN CREDENTIALS",
    "=======================================",
    "",
    ...creds.map(
      (c) =>
        `Role: ${c.role}\nName: ${c.fullName}\nEmail: ${c.email}\nPassword: ${c.password}\nMobile: ${c.mobile}\n`,
    ),
  ];
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`Seeded ${creds.length} users successfully.`);
  console.log(`Credentials file: ${outPath}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Failed to seed login users:", error);
  await mongoose.disconnect();
  process.exit(1);
});
