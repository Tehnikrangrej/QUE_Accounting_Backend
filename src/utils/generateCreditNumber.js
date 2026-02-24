const prisma = require("../config/prisma");

const generateCreditNumber = async (businessId) => {
  const count = await prisma.creditNote.count({
    where: { businessId },
  });

  return `CN-${String(count + 1).padStart(4, "0")}`;
};

module.exports = generateCreditNumber;