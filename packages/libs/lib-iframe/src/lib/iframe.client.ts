import { nanoid } from 'nanoid';

export type IframeMessageData = {
  action: string;
  id: string;
  data: any;
  replyId?: string;
};

export type IframeMessageReq = {
  req: IframeMessageData;
  onReply: (data: IframeMessageData) => void;
};

export class IframeClient {
  messageBucket: Record<string, IframeMessageReq> = {};
  //当前客户端是否是父级页面
  iframe?: HTMLIFrameElement;
  constructor(iframe?: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener('message', (event: MessageEvent<IframeMessageData>) => {
      const data = event.data;
      if (data.replyId) {
        const req = this.messageBucket[data.replyId];
        if (req) {
          req.onReply(data);
          delete this.messageBucket[data.replyId];
        }
      }
    });
  }
  isInFrame() {
    return window.self !== window.top;
  }

  async send(action: string, data?: any, replyId?: string) {
    const reqMessageData: IframeMessageData = {
      id: nanoid(),
      action,
      data,
      replyId,
    };

    return new Promise((resolve, reject) => {
      const onReply = async (reply: IframeMessageData) => {
        resolve(reply);
      };
      this.messageBucket[reqMessageData.id] = {
        req: reqMessageData,
        onReply,
      };
      try {
        if (!this.iframe) {
          if (!window.parent) {
            reject('当前页面不在 iframe 中');
          }
          window.parent.postMessage(reqMessageData, '*');
        } else {
          //子页面
          this.iframe.contentWindow?.postMessage(reqMessageData, '*');
        }
      } catch (e) {
        console.error(e);
        reject(e);
      }
    });
  }
}
