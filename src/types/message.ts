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

// 重置配置消息
export interface ResetConfigMessage extends BaseMessage {
  type: 'RESET_CONFIG';
  payload: null;
}

// 导出配置消息
export interface ExportConfigMessage extends BaseMessage {
  type: 'EXPORT_CONFIG';
  payload: null;
}

// 导入配置消息
export interface ImportConfigMessage extends BaseMessage {
  type: 'IMPORT_CONFIG';
  payload: { configJson: string };
}

// 获取存储配额消息
export interface GetStorageQuotaMessage extends BaseMessage {
  type: 'GET_STORAGE_QUOTA';
  payload: null;
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

// 创建Flashcard消息
export interface CreateFlashcardMessage extends BaseMessage {
  type: 'CREATE_FLASHCARD';
  payload: {
    translation: TranslateResult;
    groupId: string;
  };
}

// 获取所有Flashcards消息
export interface GetFlashcardsMessage extends BaseMessage {
  type: 'GET_FLASHCARDS';
  payload: null;
}

// 获取所有Flashcard分组消息
export interface GetFlashcardGroupsMessage extends BaseMessage {
  type: 'GET_FLASHCARD_GROUPS';
  payload: null;
}

// 存储配额信息
export interface StorageQuotaInfo {
  used: number;
  total: number;
  percentage: number;
}

// 所有消息类型的联合类型
export type Message =
  | TranslateMessage
  | GetConfigMessage
  | SaveConfigMessage
  | ResetConfigMessage
  | ExportConfigMessage
  | ImportConfigMessage
  | GetStorageQuotaMessage
  | PingMessage
  | TriggerTranslateMessage
  | CreateFlashcardMessage
  | GetFlashcardsMessage
  | GetFlashcardGroupsMessage;

// 消息响应类型映射
export type MessageResponse<T extends Message> = T extends TranslateMessage
  ? TranslateResult
  : T extends GetConfigMessage
  ? UserConfig
  : T extends SaveConfigMessage
  ? { success: boolean }
  : T extends ResetConfigMessage
  ? { success: boolean }
  : T extends ExportConfigMessage
  ? string
  : T extends ImportConfigMessage
  ? { success: boolean }
  : T extends GetStorageQuotaMessage
  ? StorageQuotaInfo
  : T extends PingMessage
  ? { message: string }
  : never;

// API 响应包装
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
