//////////////////////////////////////////////////////
// AUTHENTICATION TESTING SCRIPT
// Test the new JWT-based authentication system
//////////////////////////////////////////////////////

const axios = require("axios");

const BASE_URL = "http://localhost:3001";

// Test data
const testUser = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

const superAdminUser = {
  name: "Super Admin",
  email: "superadmin@system.com", // Should match SUPER_ADMIN_EMAIL in .env
  password: "superadmin@123",
};

let userToken = "";
let adminToken = "";

//////////////////////////////////////////////////////
// UTILITY FUNCTIONS
//////////////////////////////////////////////////////

const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
};

const logResult = (testName, result) => {
  console.log(`\n🧪 ${testName}`);
  if (result.success) {
    console.log(`✅ Success (${result.status})`);
    console.log(`📄 Response:`, JSON.stringify(result.data, null, 2));
  } else {
    console.log(`❌ Failed (${result.status})`);
    console.log(`🚨 Error:`, JSON.stringify(result.error, null, 2));
  }
};

//////////////////////////////////////////////////////
// TEST FUNCTIONS
//////////////////////////////////////////////////////

const testUserRegistration = async () => {
  console.log("\n🔐 Testing User Registration");
  
  const result = await makeRequest("POST", "/api/auth/register", testUser);
  logResult("Register Regular User", result);
  
  if (result.success && result.data.data?.token) {
    userToken = result.data.data.token;
    console.log(`🎫 User token saved: ${userToken.substring(0, 20)}...`);
  }
};

const testSuperAdminRegistration = async () => {
  console.log("\n👑 Testing Super Admin Registration");
  
  const result = await makeRequest("POST", "/api/auth/register", superAdminUser);
  logResult("Register Super Admin", result);
  
  if (result.success && result.data.data?.token) {
    adminToken = result.data.data.token;
    console.log(`🎫 Admin token saved: ${adminToken.substring(0, 20)}...`);
  }
};

const testUserLogin = async () => {
  console.log("\n🔑 Testing User Login");
  
  const result = await makeRequest("POST", "/api/auth/login", {
    email: testUser.email,
    password: testUser.password,
  });
  
  logResult("Login Regular User", result);
  
  if (result.success && result.data.data?.token) {
    userToken = result.data.data.token;
    console.log(`🎫 User token saved: ${userToken.substring(0, 20)}...`);
  }
};

const testSuperAdminLogin = async () => {
  console.log("\n👑 Testing Super Admin Login");
  
  const result = await makeRequest("POST", "/api/auth/login", {
    email: superAdminUser.email,
    password: superAdminUser.password,
  });
  
  logResult("Login Super Admin", result);
  
  if (result.success && result.data.data?.token) {
    adminToken = result.data.data.token;
    console.log(`🎫 Admin token saved: ${adminToken.substring(0, 20)}...`);
  }
};

const testGetCurrentUser = async (token, userType) => {
  console.log(`\n👤 Testing Get Current User (${userType})`);
  
  const result = await makeRequest("GET", "/api/auth/me", null, token);
  logResult(`Get Current User (${userType})`, result);
};

const testProtectedEndpoint = async (token, userType) => {
  console.log(`\n🛡️  Testing Protected Endpoint (${userType})`);
  
  const result = await makeRequest("GET", "/api/business", null, token);
  logResult(`Access Protected Endpoint (${userType})`, result);
};

const testAdminEndpoint = async (token, userType) => {
  console.log(`\n🔐 Testing Admin Endpoint (${userType})`);
  
  const result = await makeRequest("GET", "/api/admin/subscriptions/stats", null, token);
  logResult(`Access Admin Endpoint (${userType})`, result);
};

const testAdminEndpointWithAPIKey = async () => {
  console.log("\n🔑 Testing Admin Endpoint with API Key");
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/subscriptions/stats`, {
      headers: {
        "X-Admin-API-Key": process.env.ADMIN_API_KEY,
      },
    });
    
    logResult("Admin Endpoint with API Key", {
      success: true,
      data: response.data,
      status: response.status,
    });
  } catch (error) {
    logResult("Admin Endpoint with API Key", {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    });
  }
};

const testTokenRefresh = async () => {
  console.log("\n🔄 Testing Token Refresh");
  
  // First login to get refresh token
  const loginResult = await makeRequest("POST", "/api/auth/login", {
    email: testUser.email,
    password: testUser.password,
  });
  
  if (loginResult.success && loginResult.data.data?.refreshToken) {
    const refreshToken = loginResult.data.data.refreshToken;
    
    const refreshResult = await makeRequest("POST", "/api/auth/refresh", {
      refreshToken,
    });
    
    logResult("Token Refresh", refreshResult);
  } else {
    logResult("Token Refresh - Login Failed", loginResult);
  }
};

const testInvalidToken = async () => {
  console.log("\n🚫 Testing Invalid Token");
  
  const result = await makeRequest("GET", "/api/auth/me", null, "invalid-token");
  logResult("Invalid Token", result);
};

const testExpiredToken = async () => {
  console.log("\n⏰ Testing Expired Token");
  
  // Create an expired token manually (for testing)
  const jwt = require("jsonwebtoken");
  const expiredToken = jwt.sign(
    { userId: "test", email: "test@test.com", role: "USER" },
    process.env.JWT_SECRET,
    { expiresIn: "-1s" } // Expired
  );
  
  const result = await makeRequest("GET", "/api/auth/me", null, expiredToken);
  logResult("Expired Token", result);
};

//////////////////////////////////////////////////////
// MAIN TEST RUNNER
//////////////////////////////////////////////////////

const runTests = async () => {
  console.log("🚀 Starting Authentication Tests");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  
  try {
    // Registration tests
    await testUserRegistration();
    await testSuperAdminRegistration();
    
    // Login tests
    await testUserLogin();
    await testSuperAdminLogin();
    
    // Current user tests
    if (userToken) await testGetCurrentUser(userToken, "User");
    if (adminToken) await testGetCurrentUser(adminToken, "Admin");
    
    // Protected endpoint tests
    if (userToken) await testProtectedEndpoint(userToken, "User");
    if (adminToken) await testProtectedEndpoint(adminToken, "Admin");
    
    // Admin endpoint tests
    if (userToken) await testAdminEndpoint(userToken, "User");
    if (adminToken) await testAdminEndpoint(adminToken, "Admin");
    
    // API key test
    await testAdminEndpointWithAPIKey();
    
    // Token tests
    await testTokenRefresh();
    await testInvalidToken();
    await testExpiredToken();
    
    console.log("\n✅ All tests completed!");
    
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
  }
};

// Check if server is running
const checkServer = async () => {
  try {
    await axios.get(`${BASE_URL}/`);
    console.log("✅ Server is running");
    return true;
  } catch (error) {
    console.error("❌ Server is not running. Please start the server first.");
    console.error(`   Expected at: ${BASE_URL}`);
    return false;
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  checkServer().then(isRunning => {
    if (isRunning) {
      runTests();
    }
  });
}

module.exports = {
  runTests,
  testUserRegistration,
  testSuperAdminRegistration,
  testUserLogin,
  testSuperAdminLogin,
};
