export type EmailSend = {
  subject: string;
  content: string;
  receivers: string[];
};

export interface IEmailService {
  send(email: EmailSend): Promise<void>;
}
