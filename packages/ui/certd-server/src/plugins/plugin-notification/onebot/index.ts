import { BaseNotification, IsNotification, NotificationBody, NotificationInput } from "@certd/pipeline";
import axios from "axios";

/**
 * 文档: https://github.com/botuniverse/onebot-11
 * 教程: https://ayakasuki.com/
 */
 
@IsNotification({
  name: 'onebot',
  title: 'OneBot V11 通知',
  desc: '通过动态拼接URL发送 OneBot V11 协议消息',
  needPlus: false,
})
export class OneBotNotification extends BaseNotification {
  // 基础服务地址（不含路径）
  @NotificationInput({
    title: '服务地址',
    component: {
      placeholder: 'http://xxxx.xxxx.xxxx',
    },
    helper: 'OneBot 服务的基础地址（不包含action路径）',
    required: true,
    rules: [
      { 
        validator: (value) => /^https?:\/\/\S+$/.test(value), 
        message: '请输入有效的HTTP/HTTPS地址' 
      }
    ]
  })
  baseUrl = '';

  // 目标类型选择
  @NotificationInput({
    title: '目标类型',
    component: {
      name: 'a-select',
      options: [
        { value: 'group', label: '群聊' },
        { value: 'private', label: '私聊' },
      ],
    },
    required: true,
    helper: '选择消息发送的目标类型',
  })
  targetType = 'group';

  // 目标ID配置
  @NotificationInput({
    title: '目标ID',
    component: {
      placeholder: '123456789',
    },
    helper: '群聊ID或用户ID（纯数字）',
    required: true,
    rules: [
      { 
        validator: (value) => /^\d+$/.test(value), 
        message: 'ID必须为纯数字' 
      }
    ]
  })
  targetId = '';

  // 鉴权密钥（非必填）
  @NotificationInput({
    title: '鉴权密钥',
    component: {
      placeholder: 'xxxxxxxxxx',
    },
    helper: '(选填)访问API的授权令牌（无token时留空）',
    required: false, // 关键修改点
  })
  accessToken = '';

  // 构建完整请求URL（支持无token场景）
  private buildFullUrl(): string {
    const action = this.targetType === 'group' 
      ? 'send_group_msg' 
      : 'send_private_msg';
    
    let url = `${this.baseUrl}/${action}`;
    
    // 动态添加access_token参数（仅当存在时）
    if (this.accessToken) {
      url += `?access_token=${encodeURIComponent(this.accessToken)}`;
    }
    
    return url;
  }

  // 构建消息内容
  private buildMessage(body: NotificationBody): string {
    return body.title 
      ? `${body.title}\n${body.content}` 
      : body.content;
  }

  // 构建请求体（动态字段）
  private buildRequestBody(body: NotificationBody): object {
    return {
      [this.targetType === 'group' ? 'group_id' : 'user_id']: Number(this.targetId),
      message: this.buildMessage(body),
      auto_escape: false
    };
  }

  // 发送通知主逻辑
  async send(body: NotificationBody) {
    const fullUrl = this.buildFullUrl();
    const requestBody = this.buildRequestBody(body);

    try {
      console.debug("[ONEBOT] 最终请求URL:", fullUrl);
      console.debug("[ONEBOT] 请求体:", JSON.stringify(requestBody));
      console.debug("[ONEBOT] 使用Token:", !!this.accessToken); // 明确token使用状态

      const response = await axios.post(fullUrl, requestBody, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Certd-Notification/1.0'
        }
      });

      // 响应验证（保持不变）
      if (response.data?.retcode !== 0) {
        throw new Error(`[${response.data.retcode}] ${response.data.message}`);
      }
      return response.data;
    } catch (error) {
      console.error('[ONEBOT] 请求失败:', {
        url: fullUrl,
        tokenUsed: !!this.accessToken, // 记录token使用状态
        error: error.response?.data || error.message
      });
      throw new Error(`OneBot通知发送失败: ${error.message}`);
    }
  }
}