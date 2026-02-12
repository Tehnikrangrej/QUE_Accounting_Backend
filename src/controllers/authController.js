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
        role: "USER",      // IMPORTANT
        isActive: true,    // IMPORTANT
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
    // SUBSCRIPTION ADMIN LOGIN
    //////////////////////////////////////////////////////
    if (
      email === process.env.SUBSCRIPTION_ADMIN_EMAIL &&
      password === process.env.SUBSCRIPTION_ADMIN_PASSWORD
    ) {
      const token = generateToken({
        userId: "subscription-admin",
        email,
        role: "SUBSCRIPTION_ADMIN",
        isActive: true,
        activeBusinessId: null,
      });

      return res.json({ success: true, token, businesses: [] });
    }

    //////////////////////////////////////////////////////
    // NORMAL USER LOGIN
    //////////////////////////////////////////////////////
    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

   const token = generateToken({
  userId: user.id,
  email: user.email,
  role: user.role || "USER",   // REQUIRED
  isActive: user.isActive ?? true, // REQUIRED
  activeBusinessId: null,
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
