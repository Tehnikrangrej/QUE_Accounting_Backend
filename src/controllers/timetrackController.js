const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE TIME ENTRY
//////////////////////////////////////////////////////
exports.createTimeEntry = async (req, res) => {
  try {
    const { projectId, taskId, hours, description } = req.body;

    if (!projectId || !hours) {
      return res.status(400).json({
        success: false,
        message: "projectId & hours required",
      });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        projectId,
        taskId,
        description,
        hours: Number(hours),
        businessId: req.business.id,
      },
    });

    res.json({ success: true, entry });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET TIME ENTRIES
//////////////////////////////////////////////////////
exports.getTimeEntries = async (req, res) => {
  const data = await prisma.timeEntry.findMany({
    where: { businessId: req.business.id },
    include: {
      project: true,
      task: true,
    },
  });

  res.json({ success: true, entries: data });
};

//////////////////////////////////////////////////////
// UPDATE TIME ENTRY
//////////////////////////////////////////////////////
exports.updateTimeEntry = async (req, res) => {
  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.json({ success: true, entry });
};

//////////////////////////////////////////////////////
// DELETE TIME ENTRY
//////////////////////////////////////////////////////
exports.deleteTimeEntry = async (req, res) => {
  await prisma.timeEntry.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true });
};