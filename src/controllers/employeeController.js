const prisma = require("../config/prisma");

exports.createEmployee = async (req,res)=>{

  const businessId = req.business.id;

  const employee = await prisma.employee.create({
    data:{
      businessId,
      name:req.body.name,
      email:req.body.email,
      phone:req.body.phone,
      designation:req.body.designation,
      joinDate:req.body.joinDate,
      basicSalary:Number(req.body.basicSalary)
    }
  });

  res.json({
    success:true,
    data:employee
  });

};

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

exports.getEmployee = async (req,res)=>{

  const employee = await prisma.employee.findUnique({
    where:{
      id:req.params.id
    }
  });

  res.json({
    success:true,
    data:employee
  });

};

exports.updateEmployee = async (req,res)=>{

  const employee = await prisma.employee.update({
    where:{
      id:req.params.id
    },
    data:req.body
  });

  res.json({
    success:true,
    data:employee
  });

};

exports.deleteEmployee = async (req,res)=>{

  await prisma.employee.delete({
    where:{
      id:req.params.id
    }
  });

  res.json({
    success:true,
    message:"Employee deleted"
  });

};

