// 消息通信类型定义
import type { TranslateParams, TranslateResult, UserConfig } from './index';

// 基础消息接口
export interface BaseMessage {
  type: string;
  payload: any;
}

// 翻译消息
export interface TranslateMessage extends BaseMessage {
  type: 'TRANSLATE';
  payload: TranslateParams;
}

// 获取配置消息
export interface GetConfigMessage extends BaseMessage {
  type: 'GET_CONFIG';
  payload: null;
}

// 保存配置消息
export interface SaveConfigMessage extends BaseMessage {
  type: 'SAVE_CONFIG';
  payload: { config: UserConfig };
}

// 测试连接消息
export interface PingMessage extends BaseMessage {
  type: 'PING';
  payload: null;
}

// 触发翻译消息（用于快捷键）
export interface TriggerTranslateMessage extends BaseMessage {
  type: 'TRIGGER_TRANSLATE';
  payload: null;
}

// 所有消息类型的联合类型
export type Message =
  | TranslateMessage
  | GetConfigMessage
  | SaveConfigMessage
  | PingMessage
  | TriggerTranslateMessage;

// 消息响应类型映射
export type MessageResponse<T extends Message> = T extends TranslateMessage
  ? TranslateResult
  : T extends GetConfigMessage
  ? UserConfig
  : T extends SaveConfigMessage
  ? { success: boolean }
  : T extends PingMessage
  ? { message: string }
  : never;

// API 响应包装
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
