const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../utils/jwtUtils");

//////////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////////
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "USER",
        isActive: true,
      },
    });

    res.status(201).json({ success: true, user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //////////////////////////////////////////////////////
    // ⭐ SUBSCRIPTION ADMIN LOGIN (ENV BASED)
    //////////////////////////////////////////////////////
    if (
      email === process.env.SUBSCRIPTION_ADMIN_EMAIL &&
      password === process.env.SUBSCRIPTION_ADMIN_PASSWORD
    ) {
      const token = generateToken({
        userId: "subscription-admin",
        email,
        role: "SUPER_ADMIN", // ✅ IMPORTANT FIX
        isActive: true,
        isSubscriptionAdmin: true, // ✅ special flag
      });

      return res.json({
        success: true,
        token,
        businesses: [],
      });
    }

    //////////////////////////////////////////////////////
    // NORMAL USER LOGIN
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || "USER",
      isActive: user.isActive ?? true,
    });

    res.json({
      success: true,
      token,
      businesses: user.memberships,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//////////////////////////////////////////////////////
// GET ALL USERS
//////////////////////////////////////////////////////
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        memberships: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

