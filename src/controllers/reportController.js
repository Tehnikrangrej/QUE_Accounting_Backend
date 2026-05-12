const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// PROFIT & LOSS (WITH DATE FILTER)
//////////////////////////////////////////////////////
exports.getProfitLoss = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;

    //////////////////////////////////////////////////////
    // DATE FILTER (OPTIONAL)
    //////////////////////////////////////////////////////
    const dateFilter = {};

    if (fromDate || toDate) {
      dateFilter.date = {};
      if (fromDate) dateFilter.date.gte = new Date(fromDate);
      if (toDate) dateFilter.date.lte = new Date(toDate);
    }

    //////////////////////////////////////////////////////
    // FETCH ENTRIES
    //////////////////////////////////////////////////////
    const entries = await prisma.journalEntry.findMany({
      where: {
        businessId: req.business.id,
        ...dateFilter,
      },
      include: {
        account: true,
      },
    });

    //////////////////////////////////////////////////////
    // CALCULATE
    //////////////////////////////////////////////////////
    let income = 0;
    let expense = 0;

    entries.forEach((e) => {
      // INCOME
      if (e.account.type === "INCOME") {
        income += (e.credit || 0) - (e.debit || 0);
      }

      // EXPENSE
      if (e.account.type === "EXPENSE") {
        expense += (e.debit || 0) - (e.credit || 0);
      }
    });

    const profit = income - expense;

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      income,
      expense,
      profit,
      status: profit >= 0 ? "PROFIT" : "LOSS",
    });

  } catch (error) {
    console.error("P&L error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};