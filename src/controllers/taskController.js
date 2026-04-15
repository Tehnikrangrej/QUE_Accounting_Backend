const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE TASK
//////////////////////////////////////////////////////
exports.createTask = async (req, res) => {
  try {
    const { title, projectId, description, priority } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({
        success: false,
        message: "title & projectId required",
      });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        projectId,
      },
    });

    res.json({ success: true, task });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET TASKS
//////////////////////////////////////////////////////
exports.getTasks = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      project: {
        businessId: req.business.id,
      },
    },
    include: {
      project: true,
    },
  });

  res.json({ success: true, tasks });
};

//////////////////////////////////////////////////////
// UPDATE TASK
//////////////////////////////////////////////////////
exports.updateTask = async (req, res) => {
  const { id } = req.params;

  const task = await prisma.task.update({
    where: { id },
    data: req.body,
  });

  res.json({ success: true, task });
};

//////////////////////////////////////////////////////
// DELETE TASK
//////////////////////////////////////////////////////
exports.deleteTask = async (req, res) => {
  await prisma.task.delete({
    where: { id: req.params.id },
  });

  res.json({ success: true });
};