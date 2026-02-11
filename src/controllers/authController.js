const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const { generateToken, generateRefreshToken } = require("../utils/jwtUtils");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// REGISTER
//////////////////////////////////////////////////////

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return errorResponse(res, "Name, email, and password are required", 400);
    }

    if (password.length < 6) {
      return errorResponse(res, "Password must be at least 6 characters", 400);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return errorResponse(res, "Email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Default role is USER (handled by Prisma default)
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

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user.id);

    return successResponse(res, {
      user,
      token,
      refreshToken,
    }, "User registered successfully", 201);

  } catch (error) {
    console.error("Registration error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, "Email and password are required", 400);
    }

    // Find user with memberships
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, "Account is deactivated", 401);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    // Prepare user data for token
    const userForToken = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    // Generate tokens
    const token = generateToken(userForToken);
    const refreshToken = generateRefreshToken(user.id);

    // Prepare response data
    const responseData = {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        isSuperAdmin: user.role === "SUPER_ADMIN",
      },
      businesses: user.memberships
        .filter(membership => membership.business.isActive)
        .map(membership => ({
          id: membership.business.id,
          name: membership.business.name,
          role: membership.role.name,
          isActive: membership.isActive,
        })),
    };

    return successResponse(res, responseData, "Login successful");

  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// REFRESH TOKEN
//////////////////////////////////////////////////////

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, "Refresh token is required", 400);
    }

    // Verify refresh token
    const { success, payload, error } = require("../utils/jwtUtils").verifyRefreshToken(refreshToken);
    
    if (!success) {
      return errorResponse(res, "Invalid refresh token", 401);
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return errorResponse(res, "User not found or inactive", 401);
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user.id);

    return successResponse(res, {
      token: newToken,
      refreshToken: newRefreshToken,
    }, "Token refreshed successfully");

  } catch (error) {
    console.error("Refresh token error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// LOGOUT
//////////////////////////////////////////////////////

exports.logout = async (req, res) => {
  try {
    // In a production environment, you might want to:
    // 1. Add the token to a blacklist
    // 2. Remove the refresh token from database
    // 3. Clear any server-side sessions
    
    // For now, we'll just return success
    // The client should discard the tokens
    return successResponse(res, null, "Logout successful");

  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET CURRENT USER
//////////////////////////////////////////////////////

exports.getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, {
      ...user,
      isSuperAdmin: user.role === "SUPER_ADMIN",
    }, "User data retrieved successfully");

  } catch (error) {
    console.error("Get current user error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};
