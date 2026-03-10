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
      include:{leaves:true}
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
    // CREATE PAYSLIPS
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
          (sum, a) => sum + Number(a.amount || 0), 0
        );

        const totalDeduction = deductions.reduce(
          (sum, d) => sum + Number(d.amount || 0), 0
        );

        //////////////////////////////////////////////////////
        // LEAVE CALCULATION
        //////////////////////////////////////////////////////
        const monthLeaves = emp.leaves.filter(l=>{

          const d = new Date(l.date)

          return (
            d.getMonth()+1 === month &&
            d.getFullYear() === year
          )

        });

        let leaveCount = {}

        monthLeaves.forEach(l=>{

          const value = l.duration === "HALF" ? 0.5 : 1

          if(!leaveCount[l.leaveCode]){

            leaveCount[l.leaveCode] = 0

          }

          leaveCount[l.leaveCode] += value

        });

        let unpaidLeaves = 0

        leaveTypes.forEach(type=>{

          const used = leaveCount[type.code] || 0

          if(used > type.yearlyLimit){

            unpaidLeaves += used - type.yearlyLimit

          }

        });

        const dailySalary = basicSalary / 30

        const leaveDeduction = unpaidLeaves * dailySalary

        //////////////////////////////////////////////////////
        // FINAL SALARY
        //////////////////////////////////////////////////////
        const netSalary =
          basicSalary +
          totalAllowance -
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
            deductionList: deductions,
            month,
            year
          },
          settings
        );

        //////////////////////////////////////////////////////
        // UPLOAD TO CLOUDINARY
        //////////////////////////////////////////////////////
        const pdfUrl = await cloudinaryUpload(
          pdfBuffer,
          `payslip-${payslip.id}`
        );

        //////////////////////////////////////////////////////
        // SAVE URL
        //////////////////////////////////////////////////////
        const updatedPayslip = await prisma.payslip.update({
          where: { id: payslip.id },
          data: { pdfUrl }
        });

        return updatedPayslip;

      })
    );

    res.json({
      success: true,
      payroll,
      payslips
    });

  } catch (error) {

    console.error("Payroll Error:", error);

    res.status(500).json({
      success:false,
      message:error.message
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