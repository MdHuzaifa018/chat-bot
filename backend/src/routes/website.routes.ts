import { Router } from "express";
import { WebsiteController } from "../controllers/website.controller.js";
import { requireClientAuth } from "../middlewares/accountAuth.middleware.js";

export const websiteRouter = Router();

// Website CRUD & Management
websiteRouter.use(requireClientAuth);
websiteRouter.post("/", WebsiteController.createWebsite);
websiteRouter.post("/crawl", WebsiteController.createWebsite);
websiteRouter.get("/", WebsiteController.listWebsites);
websiteRouter.get("/:id", WebsiteController.getWebsiteDetails);
websiteRouter.patch("/:id/chatbot", WebsiteController.updateChatbotConfig);
websiteRouter.put("/:id/questions", WebsiteController.updateQuestions);
websiteRouter.post("/:id/knowledge", WebsiteController.addKnowledgeDoc);
websiteRouter.post("/:id/recrawl", WebsiteController.recrawlWebsite);
websiteRouter.get("/:id/inquiries", WebsiteController.getWebsiteInquiries);
websiteRouter.delete("/:id/inquiries/:inquiryId", WebsiteController.deleteWebsiteInquiry);
