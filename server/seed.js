require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Loan = require("./models/Loan");
const AuditLog = require("./models/AuditLog");

const MONGO_URI = process.env.MONGO_URI;

// 🔌 CONNECT DB
const connectDB = async () => {
  try {
    if (!MONGO_URI) throw new Error("MONGO_URI not found in .env");

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected for seeding");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  }
};

// 🧹 CLEAR DATABASE
const clearDatabase = async () => {
  await User.deleteMany();
  await Loan.deleteMany();
  await AuditLog.deleteMany();
  console.log("🧹 Old data cleared");
};

// 👤 CREATE USERS
const createUsers = async () => {
  const hashedPassword = await bcrypt.hash("123456", 10);

  const users = await User.insertMany([
    {
      name: "Samloth Phearak",
      email: "samlothphearak@angkorpay.com",
      password: hashedPassword,
      role: "admin",
    },
    {
      name: "Credit Officer 1",
      email: "officer1@bank.com",
      password: hashedPassword,
      role: "credit_officer",
    },
    {
      name: "Credit Officer 2",
      email: "officer2@bank.com",
      password: hashedPassword,
      role: "credit_officer",
    },
    {
      name: "Customer One",
      email: "user1@bank.com",
      password: hashedPassword,
      role: "customer",
    },
    {
      name: "Customer Two",
      email: "user2@bank.com",
      password: hashedPassword,
      role: "customer",
    },
  ]);

  console.log(`👤 ${users.length} users created`);
  return users;
};

// 💰 CREATE LOANS
const createLoans = async (users) => {
  const customers = users.filter((u) => u.role === "customer");

const loans = await Loan.insertMany([
  {
    customer: customers[0]._id,
    principal: 1000,
    interestRate: 5, // 5% per month
    termMonths: 12,
    status: "Applied",
    purpose: "Business Capital",
    notes: "First loan",
  },
  {
    customer: customers[0]._id,
    principal: 3000,
    interestRate: 6,
    termMonths: 18,
    status: "Approved",
    purpose: "Expansion",
  },
  {
    customer: customers[1]._id,
    principal: 5000,
    interestRate: 7,
    termMonths: 24,
    status: "Rejected",
    purpose: "Car Purchase",
  },
  {
    customer: customers[1]._id,
    principal: 8000,
    interestRate: 8,
    termMonths: 36,
    status: "Applied",
    purpose: "Home Renovation",
  },
]);

  console.log(`💳 ${loans.length} loans created`);
  return loans;
};

// � CREATE AUDIT LOGS
const createAuditLogs = async (users, loans) => {
  const admin = users.find(u => u.role === "admin");
  const officer = users.find(u => u.role === "credit_officer");

  const auditLogs = await AuditLog.insertMany([
    {
      user: admin._id,
      action: "CREATE",
      entity: "User",
      entityId: users[3]._id, // Customer One
      after: {
        name: "Customer One",
        email: "user1@bank.com",
        role: "customer"
      },
    },
    {
      user: officer._id,
      action: "APPROVE",
      entity: "Loan",
      entityId: loans[1]._id, // Second loan (Approved)
      before: { status: "Applied" },
      after: { status: "Approved" },
    },
    {
      user: officer._id,
      action: "REJECT",
      entity: "Loan",
      entityId: loans[2]._id, // Third loan (Rejected)
      before: { status: "Applied" },
      after: { status: "Rejected" },
    },
    {
      user: admin._id,
      action: "UPDATE",
      entity: "User",
      entityId: users[4]._id, // Customer Two
      before: { creditScore: 650 },
      after: { creditScore: 720 },
    },
    {
      user: officer._id,
      action: "CREATE",
      entity: "Loan",
      entityId: loans[3]._id, // Fourth loan
      after: {
        principal: 8000,
        interestRate: 8,
        termMonths: 36,
        status: "Applied",
        purpose: "Home Renovation"
      },
    },
  ]);

  console.log(`📝 ${auditLogs.length} audit logs created`);
};

// �🚀 MAIN SEED FUNCTION
const seedDatabase = async () => {
  try {
    await connectDB();
    await clearDatabase();

    const users = await createUsers();
    const loans = await createLoans(users);
    await createAuditLogs(users, loans);

    console.log("\n🎉 SEED SUCCESS!");
    console.log("=================================");
    console.log("👑 Admin:");
    console.log("   email: samlothphearak@angkorpay.com");
    console.log("   password: 123456\n");

    console.log("🏦 Credit Officer:");
    console.log("   email: officer1@bank.com");
    console.log("   password: 123456\n");

    console.log("👤 Customer:");
    console.log("   email: user1@bank.com");
    console.log("   password: 123456\n");

    process.exit();
  } catch (err) {
    console.error("❌ SEED FAILED:", err);
    process.exit(1);
  }
};

// RUN
seedDatabase();