/**
 * 通用日志记录工具
 *
 * 功能特性：
 * - 提供 log/info/warn/error 四种日志级别方法
 * - 支持时间戳输出（可配置）
 * - 支持日志格式化输出
 * - API 简洁直观，兼容 console 使用习惯
 * - 支持开发/生产环境差异化配置
 *
 * 使用示例：
 * ```typescript
 * import { logger } from './logger';
 *
 * // 基础用法（类似 console）
 * logger.log('普通日志消息');
 * logger.info('信息日志');
 * logger.warn('警告日志');
 * logger.error('错误日志');
 *
 * // 多参数输出
 * logger.log('用户登录', { userId: 123, time: new Date() });
 * logger.info('设备连接成功', deviceInfo);
 *
 * // 错误对象输出
 * logger.error('请求失败', error);
 *
 * // 配置日志选项
 * logger.setConfig({ enableTimestamp: false });
 * ```
 */

import dayjs from 'dayjs';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  LOG = 'log',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志配置选项
 */
export interface LoggerConfig {
  /** 是否启用时间戳，默认 true */
  enableTimestamp?: boolean;
  /** 时间戳格式，默认 'YYYY-MM-DD HH:mm:ss' */
  timestampFormat?: string;
  /** 是否启用日志输出，默认由构建环境决定，可通过此项运行时覆盖 */
  enabled?: boolean;
  /** 是否格式化对象输出，默认 true */
  formatObjects?: boolean;
  /** 日志前缀，用于区分不同模块 */
  prefix?: string;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<LoggerConfig> = {
  enableTimestamp: true,
  timestampFormat: 'YYYY-MM-DD HH:mm:ss',
  enabled: __DEV__,
  formatObjects: true,
  prefix: '',
};

/**
 * 当前日志配置
 */
let currentConfig: Required<LoggerConfig> = { ...DEFAULT_CONFIG };

/**
 * 格式化时间戳
 */
const formatTimestamp = (): string => {
  return dayjs().format(currentConfig.timestampFormat);
};

/**
 * 格式化日志参数
 * 将对象转换为可读格式
 */
const formatArgs = (args: unknown[]): unknown[] => {
  if (!currentConfig.formatObjects) {
    return args;
  }

  return args.map(arg => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) {
      return {
        name: arg.name,
        message: arg.message,
        stack: arg.stack,
      };
    }
    if (typeof arg === 'object') {
      try {
        return arg;
      } catch {
        return '[Circular Object]';
      }
    }
    return arg;
  });
};

/**
 * 核心日志输出方法
 */
const outputLog = (level: LogLevel, args: unknown[], prefixOverride?: string): void => {
  if (!currentConfig.enabled) {
    return;
  }

  const formattedArgs = formatArgs(args);
  const consoleMethod = console[level] || console.log;

  if (currentConfig.enableTimestamp) {
    const timestamp = formatTimestamp();
    const prefixValue = prefixOverride ?? currentConfig.prefix;
    const prefix = prefixValue ? `[${prefixValue}]` : '';
    consoleMethod(`${timestamp} ${prefix}`, ...formattedArgs);
  } else {
    const prefixValue = prefixOverride ?? currentConfig.prefix;
    const prefix = prefixValue ? `[${prefixValue}]` : '';
    if (prefix) {
      consoleMethod(prefix, ...formattedArgs);
    } else {
      consoleMethod(...formattedArgs);
    }
  }
};

/**
 * 日志工具对象
 */
export const logger = {
  /**
   * 普通日志输出
   */
  log: (...args: unknown[]) => outputLog(LogLevel.LOG, args),

  /**
   * 信息日志输出
   */
  info: (...args: unknown[]) => outputLog(LogLevel.INFO, args),

  /**
   * 警告日志输出
   */
  warn: (...args: unknown[]) => outputLog(LogLevel.WARN, args),

  /**
   * 错误日志输出
   */
  error: (...args: unknown[]) => outputLog(LogLevel.ERROR, args),

  /**
   * 更新日志配置
   * @param config 部分配置对象
   */
  setConfig: (config: LoggerConfig) => {
    currentConfig = { ...currentConfig, ...config };
  },

  /**
   * 获取当前配置
   */
  getConfig: (): Required<LoggerConfig> => ({ ...currentConfig }),

  /**
   * 重置为默认配置
   */
  resetConfig: () => {
    currentConfig = { ...DEFAULT_CONFIG };
  },

  /**
   * 创建带前缀的日志实例
   * @param prefix 日志前缀
   */
  create: (prefix: string) => {
    return {
      log: (...args: unknown[]) => outputLog(LogLevel.LOG, args, prefix),
      info: (...args: unknown[]) => outputLog(LogLevel.INFO, args, prefix),
      warn: (...args: unknown[]) => outputLog(LogLevel.WARN, args, prefix),
      error: (...args: unknown[]) => outputLog(LogLevel.ERROR, args, prefix),
    };
  },
};
