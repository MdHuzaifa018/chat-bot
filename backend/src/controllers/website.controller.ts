import type { Response, NextFunction } from "express";
import { WebsiteService } from "../services/website.service.js";
import type { AccountAuthRequest } from "../middlewares/accountAuth.middleware.js";
import { ApiError } from "../utils/apiError.js";

function requireClient(req: AccountAuthRequest) {
  if (!req.account || req.account.accountType !== "client") {
    throw new ApiError(401, "CLIENT_AUTH_REQUIRED", "Sign in with your client access code.");
  }
  return req.account;
}

export class WebsiteController {
  static async createWebsite(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const result = await WebsiteService.createWebsite({
        userId: account.userId,
        clientAccountId: account.id,
        name: typeof req.body?.name === "string" ? req.body.name : undefined,
        url: String(req.body?.url ?? ""),
      });
      res.status(201).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listWebsites(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const websites = await WebsiteService.listWebsites(account.id);
      res.status(200).json({ data: websites });
    } catch (error) {
      next(error);
    }
  }

  static async getWebsiteDetails(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const details = await WebsiteService.getWebsiteDetails(String(req.params.id), account.id);
      res.status(200).json({ data: details });
    } catch (error) {
      next(error);
    }
  }

  static async updateChatbotConfig(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const updated = await WebsiteService.updateChatbotConfig(String(req.params.id), account.id, req.body ?? {});
      res.status(200).json({ data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuestions(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const questions = await WebsiteService.updateSuggestedQuestions(
        String(req.params.id), account.id, req.body?.questions ?? []
      );
      res.status(200).json({ data: questions });
    } catch (error) {
      next(error);
    }
  }

  static async addKnowledgeDoc(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const doc = await WebsiteService.addKnowledgeDoc(String(req.params.id), account.id, {
        title: String(req.body?.title ?? ""),
        content: String(req.body?.content ?? ""),
        sourceType: req.body?.sourceType === "faq" ? "faq" : "manual_doc",
      });
      res.status(201).json({ data: doc });
    } catch (error) {
      next(error);
    }
  }

  static async recrawlWebsite(req: AccountAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const account = requireClient(req);
      const count = await WebsiteService.recrawlWebsite(String(req.params.id), account.id);
      res.status(200).json({ data: { pagesCrawled: count } });
    } catch (error) {
      next(error);
    }
  }
}
