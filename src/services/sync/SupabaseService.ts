// Supabase 服务层
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/**
 * Chrome 扩展存储适配器
 * 用于在 Service Worker 中持久化 Supabase 会话
 * Service Worker 无法访问 localStorage，需要使用 chrome.storage.local
 */
const chromeStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error('Failed to get item from chrome.storage:', error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Failed to set item to chrome.storage:', error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Failed to remove item from chrome.storage:', error);
    }
  },
};

/**
 * Supabase 服务
 * 提供 Supabase 客户端初始化和基础操作
 */
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private currentUser: User | null = null;

  /**
   * 初始化 Supabase 客户端
   * 使用自定义存储适配器以支持 Service Worker 环境
   */
  async initialize(): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials not configured');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: chromeStorageAdapter, // 使用 chrome.storage.local 持久化会话
      },
    });

    // 监听认证状态变化
    this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session?.user || null;
      console.info('Auth state changed:', _event, session?.user?.email || 'no user');
    });

    // 尝试从存储中恢复会话
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) {
        console.warn('Failed to restore session:', error.message);
      } else if (data.session) {
        this.currentUser = data.session.user;
        console.info('Session restored for:', data.session.user.email);
      } else {
        console.info('No existing session found');
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }

    console.info('Supabase initialized');
  }

  /**
   * 获取 Supabase 客户端
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.client !== null;
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * 获取当前用户 ID
   */
  getUserId(): string {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }
    return this.currentUser.id;
  }

  /**
   * 使用邮箱密码登录
   */
  async signInWithPassword(email: string, password: string): Promise<User> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`登录失败: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('登录失败: 未返回用户信息');
    }

    this.currentUser = data.user;
    return data.user;
  }

  /**
   * 注册新用户
   */
  async signUp(email: string, password: string): Promise<User> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(`注册失败: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('注册失败: 未返回用户信息');
    }

    this.currentUser = data.user;
    return data.user;
  }

  /**
   * 登出
   */
  async signOut(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(`登出失败: ${error.message}`);
    }

    this.currentUser = null;
  }

  /**
   * 获取当前会话
   */
  async getSession() {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client.auth.getSession();

    if (error) {
      throw new Error(`获取会话失败: ${error.message}`);
    }

    return data.session;
  }

  /**
   * 刷新会话
   */
  async refreshSession() {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.client.auth.refreshSession();

    if (error) {
      throw new Error(`刷新会话失败: ${error.message}`);
    }

    return data.session;
  }
}

/**
 * 单例实例
 */
export const supabaseService = new SupabaseService();
