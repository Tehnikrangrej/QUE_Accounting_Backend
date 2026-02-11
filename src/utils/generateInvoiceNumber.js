module.exports = async (prisma, businessId) => {
  const count = await prisma.invoice.count({
    where: { businessId },
  });

  return `INV-${count + 1}`;
};
