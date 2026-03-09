const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE EMPLOYEE
//////////////////////////////////////////////////////
exports.createEmployee = async (req,res)=>{

  try{

    const businessId = req.business.id;

    const employee = await prisma.employee.create({
      data:{
        businessId,
        name:req.body.name,
        email:req.body.email,
        phone:req.body.phone,
        designation:req.body.designation,
        joinDate:req.body.joinDate,
        basicSalary:Number(req.body.basicSalary),

        allowance:req.body.allowance || [],
        deduction:req.body.deduction || []
      }
    });

    res.json({
      success:true,
      data:employee
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET ALL EMPLOYEES
//////////////////////////////////////////////////////
exports.getAllEmployees = async (req,res)=>{

  const businessId = req.business.id;

  const employees = await prisma.employee.findMany({
    where:{businessId}
  });

  res.json({
    success:true,
    data:employees
  });

};

//////////////////////////////////////////////////////
// GET SINGLE EMPLOYEE
//////////////////////////////////////////////////////
exports.getEmployee = async (req,res)=>{

  const employee = await prisma.employee.findUnique({
    where:{ id:req.params.id }
  });

  res.json({
    success:true,
    data:employee
  });

};

//////////////////////////////////////////////////////
// UPDATE EMPLOYEE
//////////////////////////////////////////////////////
exports.updateEmployee = async (req,res)=>{

  const employee = await prisma.employee.update({
    where:{ id:req.params.id },
    data:req.body
  });

  res.json({
    success:true,
    data:employee
  });

};

//////////////////////////////////////////////////////
// DELETE EMPLOYEE
//////////////////////////////////////////////////////
exports.deleteEmployee = async (req,res)=>{

  await prisma.employee.delete({
    where:{ id:req.params.id }
  });

  res.json({
    success:true,
    message:"Employee deleted"
  });

};