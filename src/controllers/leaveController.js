const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE LEAVE
//////////////////////////////////////////////////////
exports.createLeave = async (req, res) => {

  try {

    const businessId = req.business.id;
    const { employeeId, leaveCode, date, duration } = req.body;

    if (!employeeId || !leaveCode || !date || !duration) {
      return res.status(400).json({
        success:false,
        message:"Missing required fields"
      });
    }

    const leaveDate = new Date(date);

    //////////////////////////////////////////////////////
    // CHECK EMPLOYEE
    //////////////////////////////////////////////////////
    const employee = await prisma.employee.findUnique({
      where:{ id: employeeId }
    });

    if(!employee){
      return res.status(404).json({
        success:false,
        message:"Employee not found"
      });
    }

    //////////////////////////////////////////////////////
    // PREVENT MULTIPLE LEAVES SAME DATE
    //////////////////////////////////////////////////////
    const startOfDay = new Date(leaveDate);
    startOfDay.setHours(0,0,0,0);

    const endOfDay = new Date(leaveDate);
    endOfDay.setHours(23,59,59,999);

    const existingLeave = await prisma.leave.findFirst({
      where:{
        employeeId,
        date:{
          gte:startOfDay,
          lte:endOfDay
        }
      }
    });

    if(existingLeave){
      return res.status(400).json({
        success:false,
        message:"Employee already has leave on this date"
      });
    }

    //////////////////////////////////////////////////////
    // LEAVE BALANCE CHECK
    //////////////////////////////////////////////////////
    let leaveBalance = employee.leaveBalance || {};
    const deduction = duration === "HALF" ? 0.5 : 1;

    if(leaveCode !== "LWP"){

      if(leaveBalance[leaveCode] === undefined){
        return res.status(400).json({
          success:false,
          message:"Invalid leave type"
        });
      }

      if(leaveBalance[leaveCode] < deduction){
        return res.status(400).json({
          success:false,
          message:`${leaveCode} balance finished. Use LWP`
        });
      }

      leaveBalance[leaveCode] -= deduction;

    }

    //////////////////////////////////////////////////////
    // CREATE LEAVE
    //////////////////////////////////////////////////////
    const leave = await prisma.leave.create({
      data:{
        businessId,
        employeeId,
        leaveCode,
        duration,
        date:leaveDate
      }
    });

    //////////////////////////////////////////////////////
    // UPDATE BALANCE (NOT FOR LWP)
    //////////////////////////////////////////////////////
    if(leaveCode !== "LWP"){
      await prisma.employee.update({
        where:{ id:employeeId },
        data:{ leaveBalance }
      });
    }

    res.json({
      success:true,
      data:leave,
      updatedLeaveBalance:leaveBalance
    });

  } catch(error){

    console.error(error);

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};

//////////////////////////////////////////////////////
// GET ALL LEAVES
//////////////////////////////////////////////////////
exports.getLeaves = async (req,res)=>{

  try{

    const businessId = req.business.id;

    const leaves = await prisma.leave.findMany({

      where:{ businessId },

      include:{
        employee:{
          select:{
            id:true,
            name:true,
            designation:true
          }
        }
      },

      orderBy:{
        date:"desc"
      }

    });

    res.json({
      success:true,
      data:leaves
    });

  }catch(error){

    res.status(500).json({
      success:false,
      message:error.message
    });

  }

};