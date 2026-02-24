const router = require("express").Router();

const controller = require("../controllers/creditNoteController");

const auth = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const creditNoteAccess = require("../middlewares/creditNoteAccess");

//////////////////////////////////////////////////////
// OWNER → VIEW ALL CREDIT NOTES
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  businessMiddleware,
  controller.getCreditNotes
);

//////////////////////////////////////////////////////
// VIEW SINGLE CREDIT NOTE
//////////////////////////////////////////////////////
router.get(
  "/:id",
  auth,
  businessMiddleware,
  creditNoteAccess,
  controller.getCreditNote
);

//////////////////////////////////////////////////////
// VIEW CREDIT NOTES BY CUSTOMER
//////////////////////////////////////////////////////
router.get(
  "/customer/:customerId",
  auth,
  businessMiddleware,
  controller.getCustomerCredits
);

module.exports = router;