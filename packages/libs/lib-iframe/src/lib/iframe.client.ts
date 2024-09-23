import { nanoid } from 'nanoid';

export type IframeMessageData<T> = {
  action: string;
  id: string;
  data?: T;
  replyId?: string;
  errorCode?: number; //0为成功
  message?: string;
};

export type IframeMessageReq<T = any, R = any> = {
  req: IframeMessageData<T>;
  onReply: (data: IframeMessageData<R>) => void;
};

export class IframeException extends Error {
  code?: number = 0;
  constructor(data: IframeMessageData<any>) {
    super(data.message);
    this.code = data.errorCode;
  }
}

export class IframeClient {
  requestQueue: Record<string, IframeMessageReq> = {};
  //当前客户端是否是父级页面
  iframe?: HTMLIFrameElement;

  handlers: Record<string, (data: IframeMessageData<any>) => Promise<void>> = {};
  constructor(iframe?: HTMLIFrameElement) {
    this.iframe = iframe;
    window.addEventListener('message', async (event: MessageEvent<IframeMessageData<any>>) => {
      const data = event.data;
      if (data.action) {
        console.log(`收到消息[isSub:${this.isInFrame()}]`, data);
        try {
          const handler = this.handlers[data.action];
          if (handler) {
            debugger;
            const res = await handler(data);
            if (data.id && data.action !== 'reply') {
              await this.send('reply', res, data.id);
            }
          } else {
            throw new Error(`action:${data.action} 未注册处理器`);
          }
        } catch (e: any) {
          console.error(e);
          await this.send('reply', {}, data.id, 500, e.message);
        }
      }
    });

    this.register('reply', async data => {
      const req = this.requestQueue[data.replyId!];
      if (req) {
        req.onReply(data);
        delete this.requestQueue[data.replyId!];
      }
    });
  }
  isInFrame() {
    return window.self !== window.top;
  }

  register<T = any>(action: string, handler: (data: IframeMessageData<T>) => Promise<void>) {
    this.handlers[action] = handler;
  }

  async send<R = any, T = any>(action: string, data?: T, replyId?: string, errorCode?: number, message?: string): Promise<IframeMessageData<R>> {
    const reqMessageData: IframeMessageData<T> = {
      id: nanoid(),
      action,
      data,
      replyId,
      errorCode,
      message,
    };

    return new Promise((resolve, reject) => {
      const onReply = (reply: IframeMessageData<R>) => {
        if (reply.errorCode && reply.errorCode > 0) {
          reject(new IframeException(reply));
          return;
        }
        resolve(reply);
      };
      this.requestQueue[reqMessageData.id] = {
        req: reqMessageData,
        onReply,
      };
      try {
        console.log(`send message[isSub:${this.isInFrame()}]:`, reqMessageData);
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
