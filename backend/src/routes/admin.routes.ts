import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAdminAuth, requireAnyPermission, requirePermission } from "../middlewares/accountAuth.middleware.js";

export const adminRouter = Router();

adminRouter.get("/overview", requireAdminAuth, requirePermission("viewTelemetry"), AdminController.getOverview);
adminRouter.delete("/websites/:id", requireAdminAuth, AdminController.deleteWebsite);
adminRouter.get("/requests", requireAdminAuth, requireAnyPermission(["acceptRequests", "rejectRequests"]), AdminController.listRequests);
adminRouter.patch("/requests/:id", requireAdminAuth, requireAnyPermission(["acceptRequests", "rejectRequests"]), AdminController.updateRequest);
adminRouter.post("/requests/:id/approve", requireAdminAuth, requirePermission("acceptRequests"), AdminController.approveRequest);
adminRouter.post("/requests/:id/reject", requireAdminAuth, requirePermission("rejectRequests"), AdminController.rejectRequest);
adminRouter.delete("/requests/:id", requireAdminAuth, requireAnyPermission(["acceptRequests", "rejectRequests"]), AdminController.deleteRequest);
adminRouter.post("/clients/reset-code", requireAdminAuth, requirePermission("acceptRequests"), AdminController.resetClientAccessCode);
adminRouter.get("/employees", requireAdminAuth, requirePermission("manageTeam"), AdminController.listEmployees);
adminRouter.post("/employees", requireAdminAuth, requirePermission("manageTeam"), AdminController.createEmployee);
adminRouter.patch("/employees/:id", requireAdminAuth, requirePermission("manageTeam"), AdminController.updateEmployee);
adminRouter.patch("/employees/:id/permissions", requireAdminAuth, requirePermission("manageTeam"), AdminController.updateEmployeePermissions);
adminRouter.delete("/employees/:id", requireAdminAuth, requirePermission("manageTeam"), AdminController.deleteEmployee);
