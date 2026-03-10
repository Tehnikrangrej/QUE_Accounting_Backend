const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE LEAVE
//////////////////////////////////////////////////////
exports.createLeave = async (req, res) => {
    console.log("Create Leave Request Body");

  try {

    const businessId = req.business.id;

    const { employeeId, leaveCode, date, duration } = req.body;

    if (!employeeId || !leaveCode || !date || !duration) {
      return res.status(400).json({
        success:false,
        message:"Missing required fields"
      });
    }

    const leave = await prisma.leave.create({
      data:{
        businessId,
        employeeId,
        leaveCode,
        duration,
        date:new Date(date)
      }
    });

    return res.json({
      success:true,
      data:leave
    });

  } catch(error){

    console.error("Create Leave Error:",error);

    return res.status(500).json({
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