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
    // GET SETTINGS (LOGO / ADDRESS)
    //////////////////////////////////////////////////////
    const settings = await prisma.settings.findUnique({
      where: { businessId }
    });

    //////////////////////////////////////////////////////
    // GET ALL EMPLOYEES
    //////////////////////////////////////////////////////
    const employees = await prisma.employee.findMany({
      where: { businessId }
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
    // CREATE PAYSLIPS + GENERATE PDF
    //////////////////////////////////////////////////////
    const payslips = await Promise.all(

      employees.map(async (emp) => {

        const basicSalary = emp.basicSalary;
        const allowance = emp.allowance || 0;
        const deduction = emp.deduction || 0;

        const netSalary = basicSalary + allowance - deduction;

        //////////////////////////////////////////////////////
        // CREATE PAYSLIP
        //////////////////////////////////////////////////////
        const payslip = await prisma.payslip.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            employeeName: emp.name,
            basicSalary,
            allowance,
            deduction,
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
        // UPDATE PAYSLIP WITH PDF URL
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
      success: false,
      message: error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET ALL PAYROLLS
//////////////////////////////////////////////////////
exports.getPayrolls = async (req, res) => {

  try {

    const businessId = req.business.id;

    const payrolls = await prisma.payroll.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      data: payrolls
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET SINGLE PAYROLL
//////////////////////////////////////////////////////
exports.getPayroll = async (req, res) => {

  try {

    const payroll = await prisma.payroll.findUnique({
      where: {
        id: req.params.id
      },
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

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

//////////////////////////////////////////////////////
// MARK SALARY AS PAID
//////////////////////////////////////////////////////
exports.paySalary = async (req, res) => {

  try {

    const payslip = await prisma.payslip.update({
      where: {
        id: req.params.id
      },
      data: {
        status: "paid"
      }
    });

    res.json({
      success: true,
      data: payslip
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

//////////////////////////////////////////////////////
// DELETE PAYROLL
//////////////////////////////////////////////////////
exports.deletePayroll = async (req, res) => {

  try {

    const payrollId = req.params.id;

    //////////////////////////////////////////////////////
    // DELETE PAYSLIPS
    //////////////////////////////////////////////////////
    await prisma.payslip.deleteMany({
      where: {
        payrollId
      }
    });

    //////////////////////////////////////////////////////
    // DELETE PAYROLL
    //////////////////////////////////////////////////////
    await prisma.payroll.delete({
      where: {
        id: payrollId
      }
    });

    res.json({
      success: true,
      message: "Payroll deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};