const prisma = require("../config/prisma");

//////////////////////////////////////////////////////
// CREATE PROJECT
//////////////////////////////////////////////////////
exports.createProject = async (req, res) => {
  try {
    const { name, description, customerId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name required",
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        customerId,
        businessId: req.business.id,
      },
    });

    res.json({ success: true, project });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//////////////////////////////////////////////////////
// GET PROJECTS
//////////////////////////////////////////////////////
exports.getProjects = async (req, res) => {
  const data = await prisma.project.findMany({
    where: { businessId: req.business.id },
    include: {
      customer: true,
      tasks: true,
      timeEntries: true,
    },
  });

  res.json({ success: true, projects: data });
};

//////////////////////////////////////////////////////
// UPDATE PROJECT
//////////////////////////////////////////////////////
exports.updateProject = async (req, res) => {
  const { id } = req.params;

  const updated = await prisma.project.update({
    where: { id },
    data: req.body,
  });

  res.json({ success: true, project: updated });
};

//////////////////////////////////////////////////////
// DELETE PROJECT
//////////////////////////////////////////////////////
exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  await prisma.project.delete({
    where: { id },
  });

  res.json({ success: true, message: "Deleted" });
};