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
        // FILTER LEAVES
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

        //////////////////////////////////////////////////////
        // LEAVE COUNTS
        //////////////////////////////////////////////////////
        let monthLeaveCount = {};
        let yearLeaveCount = {};
        let unpaidLeaves = 0;

        // MONTH LEAVES
        monthLeaves.forEach(l => {

          const value = l.duration === "HALF" ? 0.5 : 1;

          if (!monthLeaveCount[l.leaveCode]) {
            monthLeaveCount[l.leaveCode] = 0;
          }

          monthLeaveCount[l.leaveCode] += value;

          // LWP always unpaid
          if (l.leaveCode === "LWP") {
            unpaidLeaves += value;
          }

        });

        // YEAR LEAVES
        yearLeaves.forEach(l => {

          const value = l.duration === "HALF" ? 0.5 : 1;

          if (!yearLeaveCount[l.leaveCode]) {
            yearLeaveCount[l.leaveCode] = 0;
          }

          yearLeaveCount[l.leaveCode] += value;

        });

        //////////////////////////////////////////////////////
        // CHECK YEARLY LIMIT
        //////////////////////////////////////////////////////
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
          grossSalary -
          totalDeduction -
          leaveDeduction;

        //////////////////////////////////////////////////////
        // CREATE PAYSLIP
        //////////////////////////////////////////////////////
        const payslip = await prisma.payslip.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            employeeName: emp.name,
            basicSalary,
            allowance: totalAllowance,
            deduction: totalDeduction + leaveDeduction,
            netSalary,
            status: "pending"
          }
        });

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
              {
                name: "Leave",
                amount: leaveDeduction
              }
            ],
            leaveSummary: monthLeaveCount,
            unpaidLeaves,
            month,
            year
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