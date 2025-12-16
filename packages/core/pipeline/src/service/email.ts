export type EmailSend = {
  subject: string;
  receivers: string[];
  content?: string;
  attachments?: any[];
  html?: string;
};

export type EmailSendByTemplateReq = {
  type: string;
  data: any;
  receivers: string[];
  attachments?: any[];
};

export interface IEmailService {
  send(email: EmailSend): Promise<void>;
  sendByTemplate(req: EmailSendByTemplateReq): Promise<void>;
}
