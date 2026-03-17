const prisma = require("../config/prisma");
const generatePdf = require("../utils/generatePayslipPdf");
const cloudinaryUpload = require("../utils/uploadPdf");

//////////////////////////////////////////////////////
// RUN PAYROLL
//////////////////////////////////////////////////////
exports.runPayroll = async (req, res) => {

  try {

    const businessId = req.business.id;
    const { month, year } = req.body;

    //////////////////////////////////////////////////////
    // GET SETTINGS
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    const leaveTypes = settings?.leaveTypes || [];

    //////////////////////////////////////////////////////
    // GET EMPLOYEES
    //////////////////////////////////////////////////////
    const employees = await prisma.employee.findMany({
      where: { businessId },
      include: { leaves: true }
    });

    if (!employees.length) {
      return res.json({
        success: false,
        message: "No employees found"
      });
    }

    //////////////////////////////////////////////////////
    // CREATE PAYROLL
    //////////////////////////////////////////////////////
    const payroll = await prisma.payroll.create({
      data: {
        businessId,
        month,
        year,
        status: "draft"
      }
    });

    //////////////////////////////////////////////////////
    // GENERATE PAYSLIPS
    //////////////////////////////////////////////////////
    const payslips = await Promise.all(

      employees.map(async (emp) => {

        const basicSalary = emp.basicSalary;

        //////////////////////////////////////////////////////
        // LOAN DEDUCTION
        //////////////////////////////////////////////////////
        const loan = await prisma.loan.findFirst({
          where: {
            employeeId: emp.id,
            businessId,
            status: "active",
          },
        });

        let loanDeduction = 0;

        if (loan && loan.remainingAmount > 0) {
          loanDeduction = Math.min(
            loan.emiAmount,
            loan.remainingAmount
          );
        }

        //////////////////////////////////////////////////////
        // ALLOWANCES
        //////////////////////////////////////////////////////
        const allowances = Array.isArray(emp.allowance)
          ? emp.allowance
          : [];

        const deductions = Array.isArray(emp.deduction)
          ? emp.deduction
          : [];

        const totalAllowance = allowances.reduce(
          (sum, a) => sum + Number(a.amount || 0),
          0
        );

        const totalDeduction = deductions.reduce(
          (sum, d) => sum + Number(d.amount || 0),
          0
        );

        const grossSalary = basicSalary + totalAllowance;

        //////////////////////////////////////////////////////
        // OVERTIME
        //////////////////////////////////////////////////////
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const overtimeData = await prisma.overtime.aggregate({
          where: {
            employeeId: emp.id,
            businessId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { overtimeHours: true },
        });

        const totalOvertimeHours =
          overtimeData._sum.overtimeHours || 0;

        const workingDays = settings?.workingDaysPerMonth || 30;
        const hoursPerDay = settings?.workingHoursPerDay || 8;
        const multiplier = settings?.overtimeRate || 1.5;

        const hourlyRate =
          basicSalary / workingDays / hoursPerDay;

        const overtimePay =
          totalOvertimeHours * hourlyRate * multiplier;

        //////////////////////////////////////////////////////
        // LEAVES
        //////////////////////////////////////////////////////
        const monthLeaves = emp.leaves.filter(l => {
          const d = new Date(l.date);
          return (
            d.getMonth() + 1 === month &&
            d.getFullYear() === year
          );
        });

        const yearLeaves = emp.leaves.filter(l => {
          const d = new Date(l.date);
          return d.getFullYear() === year;
        });

        let monthLeaveCount = {};
        let yearLeaveCount = {};
        let unpaidLeaves = 0;

        monthLeaves.forEach(l => {
          const value = l.duration === "HALF" ? 0.5 : 1;

          if (!monthLeaveCount[l.leaveCode]) {
            monthLeaveCount[l.leaveCode] = 0;
          }

          monthLeaveCount[l.leaveCode] += value;

          if (l.leaveCode === "LWP") {
            unpaidLeaves += value;
          }
        });

        yearLeaves.forEach(l => {
          const value = l.duration === "HALF" ? 0.5 : 1;

          if (!yearLeaveCount[l.leaveCode]) {
            yearLeaveCount[l.leaveCode] = 0;
          }

          yearLeaveCount[l.leaveCode] += value;
        });

        leaveTypes.forEach(type => {
          if (type.code === "LWP") return;

          const usedYear = yearLeaveCount[type.code] || 0;
          const usedMonth = monthLeaveCount[type.code] || 0;

          if (
            type.yearlyLimit !== null &&
            usedYear > type.yearlyLimit
          ) {
            const exceeded = usedYear - type.yearlyLimit;
            unpaidLeaves += Math.min(exceeded, usedMonth);
          }
        });

        //////////////////////////////////////////////////////
        // LEAVE DEDUCTION
        //////////////////////////////////////////////////////
        const dailySalary = grossSalary / 30;
        const leaveDeduction = unpaidLeaves * dailySalary;

        //////////////////////////////////////////////////////
        // FINAL SALARY
        //////////////////////////////////////////////////////
        const netSalary =
          grossSalary +
          overtimePay -
          totalDeduction -
          leaveDeduction -
          loanDeduction;

        //////////////////////////////////////////////////////
        // CREATE PAYSLIP
        //////////////////////////////////////////////////////
        const payslip = await prisma.payslip.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            employeeName: emp.name,
            basicSalary,
            allowance: totalAllowance + overtimePay,
            deduction: totalDeduction + leaveDeduction + loanDeduction,
            overtimePay,
            loanDeduction, // 🔥 ADDED
            netSalary,
            status: "pending"
          }
        });

        //////////////////////////////////////////////////////
        // 🔥 UPDATE LOAN AFTER EMI
        //////////////////////////////////////////////////////
        if (loan && loanDeduction > 0) {
          const newRemaining = loan.remainingAmount - loanDeduction;

          await prisma.loan.update({
            where: { id: loan.id },
            data: {
              remainingAmount: newRemaining,
              status: newRemaining <= 0 ? "completed" : "active",
            },
          });
        }

        //////////////////////////////////////////////////////
        // GENERATE PDF
        //////////////////////////////////////////////////////
        const pdfBuffer = await generatePdf(
          {
            ...payslip,
            employee: emp,
            allowanceList: allowances,
            deductionList: [
              ...deductions,
              { name: "Leave", amount: leaveDeduction },
              { name: "Loan EMI", amount: loanDeduction } // 🔥 ADDED
            ],
            leaveSummary: monthLeaveCount,
            unpaidLeaves,
            month,
            year,
            overtimePay,
            totalOvertimeHours
          },
          settings
        );

        //////////////////////////////////////////////////////
        // UPLOAD PDF
        //////////////////////////////////////////////////////
        const pdfUrl = await cloudinaryUpload(
          pdfBuffer,
          `payslip-${payslip.id}`
        );

        //////////////////////////////////////////////////////
        // UPDATE PAYSLIP
        //////////////////////////////////////////////////////
        const updatedPayslip = await prisma.payslip.update({
          where: { id: payslip.id },
          data: { pdfUrl }
        });

        return updatedPayslip;

      })

    );

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////
    res.json({
      success: true,
      payroll,
      payslips
    });

  } catch (error) {

    console.error("Payroll Error:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};
//////////////////////////////////////////////////////
// GET ALL PAYROLLS
//////////////////////////////////////////////////////
exports.getPayrolls = async (req, res) => {

  const businessId = req.business.id;

  const payrolls = await prisma.payroll.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    success: true,
    data: payrolls
  });

};

//////////////////////////////////////////////////////
// GET SINGLE PAYROLL
//////////////////////////////////////////////////////
exports.getPayroll = async (req, res) => {

  const payroll = await prisma.payroll.findUnique({
    where: { id: req.params.id },
    include: {
      payslips: {
        include: {
          employee: true
        }
      }
    }
  });

  res.json({
    success: true,
    data: payroll
  });

};

//////////////////////////////////////////////////////
// MARK SALARY PAID
//////////////////////////////////////////////////////
exports.paySalary = async (req, res) => {

  const payslip = await prisma.payslip.update({
    where: { id: req.params.id },
    data: { status: "paid" }
  });

  res.json({
    success: true,
    data: payslip
  });

};

//////////////////////////////////////////////////////
// DELETE PAYROLL
//////////////////////////////////////////////////////
exports.deletePayroll = async (req, res) => {

  const payrollId = req.params.id;

  await prisma.payslip.deleteMany({
    where: { payrollId }
  });

  await prisma.payroll.delete({
    where: { id: payrollId }
  });

  res.json({
    success: true,
    message: "Payroll deleted successfully"
  });

};