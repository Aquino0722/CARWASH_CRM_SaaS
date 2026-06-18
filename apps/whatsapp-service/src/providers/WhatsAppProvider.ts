export interface SendMessageParams {
  recipientPhoneE164: string;
  templateKey: string;
  payload: Record<string, unknown>;
}

export interface WhatsAppProvider {
  sendMessage(params: SendMessageParams): Promise<string>;
}
