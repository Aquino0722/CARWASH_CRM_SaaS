import { randomUUID } from "node:crypto";
import { logger } from "../logger.js";
import { maskPhone } from "../phone.js";
import type { WhatsAppProvider, SendMessageParams } from "./WhatsAppProvider.js";

export class MockWhatsAppProvider implements WhatsAppProvider {
  private failRate: number;

  constructor(failRate: number = 0) {
    this.failRate = failRate;
  }

  async sendMessage(params: SendMessageParams): Promise<string> {
    const maskedRecipient = maskPhone(params.recipientPhoneE164);
    const payloadKeys = Object.keys(params.payload);

    logger.info({
      templateKey: params.templateKey,
      recipient: maskedRecipient,
      payloadKeys,
    }, "mock provider: would send message");

    if (Math.random() < this.failRate) {
      throw new Error("simulated mock provider failure");
    }

    return `mock-${randomUUID()}`;
  }
}
