/**
 * @file 数据库连接与 Schema（sql.js / WASM SQLite）
 * @description 使用纯 WASM 的 SQLite，零原生编译、可离线运行；启动时加载/创建持久化文件并建表。
 * 设计思路：内存执行（同步）+ 防抖落盘；查询全部使用预编译参数绑定，避免字符串拼接。
 * 零知识架构：vaults 仅保存密文、nonce 与版本号，服务端永远拿不到明文与密钥。
 * 创建时间：2026-09-18
 */
import initSqlJs, { type Database, type SqlJsStatic, type Statement } from 'sql.js'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'
import { createRequire } from 'node:module'
import { config } from '../config.js'

const nodeRequire = createRequire(import.meta.url)

/** 建表语句（幂等，多语句） */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS vaults (
    user_id     TEXT PRIMARY KEY,
    ciphertext  TEXT NOT NULL,
    nonce       TEXT NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`

/**
 * 将单个绑定值转换为 sql.js 支持的标量（布尔转 0/1）
 *
 * @param {unknown} value - 原始值
 * @returns {(string|number|null)} 绑定标量
 */
function coerceBinding(value: unknown): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0
  return value as string | number | null
}

/**
 * 将方法的可变参数规范化为位置绑定数组
 * 规则：单参数且为数组→展开绑定；单参数且为对象→取其值；单标量→单值；多个参数→按顺序绑定。
 *
 * @param {unknown[]} args - 调用方传入的参数列表
 * @returns {(string|number|null)[]} sql.js 绑定数组
 */
function normalizeBindings(args: unknown[]): (string | number | null)[] {
  if (args.length === 1) {
    const only = args[0]
    if (only === undefined) return []
    if (Array.isArray(only)) return only.map(coerceBinding)
    if (typeof only === 'object' && only !== null) {
      return Object.values(only as Record<string, unknown>).map(coerceBinding)
    }
    return [coerceBinding(only)]
  }
  return args.map(coerceBinding)
}

/**
 * 预编译语句门面（兼容 better-sqlite3 风格的 get/all/run）
 */
class StatementFacade {
  private readonly database: Database
  private readonly sql: string
  private readonly onWrite: () => void

  /**
   * @param {Database} database - sql.js 数据库
   * @param {string} sql - SQL 文本
   * @param {() => void} onWrite - 写操作后回调（触发持久化）
   */
  constructor(database: Database, sql: string, onWrite: () => void) {
    this.database = database
    this.sql = sql
    this.onWrite = onWrite
  }

  /**
   * 执行写操作，返回影响行数
   *
   * @param {unknown} params - 绑定参数
   * @returns {{ changes: number }} 影响行数
   */
  run(...args: unknown[]): { changes: number } {
    const stmt: Statement = this.database.prepare(this.sql)
    try {
      stmt.bind(normalizeBindings(args))
      stmt.step()
    } finally {
      stmt.free()
    }
    const changes = this.database.getRowsModified()
    this.onWrite()
    return { changes }
  }

  /**
   * 查询单条；无结果返回 undefined
   *
   * @param {unknown} params - 绑定参数
   * @returns {Record<string, unknown> | undefined} 行对象
   */
  get(...args: unknown[]): Record<string, unknown> | undefined {
    const stmt: Statement = this.database.prepare(this.sql)
    let row: Record<string, unknown> | undefined
    try {
      stmt.bind(normalizeBindings(args))
      if (stmt.step()) row = stmt.getAsObject()
    } finally {
      stmt.free()
    }
    return row
  }

  /**
   * 查询全部
   *
   * @param {unknown} params - 绑定参数
   * @returns {Record<string, unknown>[]} 行数组
   */
  all(...args: unknown[]): Record<string, unknown>[] {
    const stmt: Statement = this.database.prepare(this.sql)
    const rows: Record<string, unknown>[] = []
    try {
      stmt.bind(normalizeBindings(args))
      while (stmt.step()) rows.push(stmt.getAsObject())
    } finally {
      stmt.free()
    }
    return rows
  }
}

/**
 * SQL 数据库门面
 * 核心用途：对外暴露 prepare/exec，并负责把内存数据防抖持久化到磁盘。
 */
export class SqlFacade {
  private readonly database: Database
  private readonly filePath: string
  private persistTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * @param {Database} database - sql.js 实例
   * @param {string} filePath - 持久化文件路径
   */
  constructor(database: Database, filePath: string) {
    this.database = database
    this.filePath = filePath
  }

  /**
   * 预编译一条语句
   *
   * @param {string} sql - SQL 文本
   * @returns {StatementFacade} 语句门面
   */
  prepare(sql: string): StatementFacade {
    return new StatementFacade(this.database, sql, () => this.schedulePersist())
  }

  /**
   * 执行无返回的多语句（如建表、PRAGMA）
   *
   * @param {string} sql - SQL 文本
   * @returns {void}
   */
  exec(sql: string): void {
    this.database.exec(sql)
    this.schedulePersist()
  }

  /**
   * 防抖持久化（150ms 内合并多次写）
   *
   * @returns {void}
   */
  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer)
    this.persistTimer = setTimeout(() => {
      try {
        mkdirSync(dirname(this.filePath), { recursive: true })
        writeFileSync(this.filePath, Buffer.from(this.database.export()))
      } catch (err) {
        console.error('[db] 持久化失败:', err)
      }
    }, 150)
  }

  /**
   * 立即持久化（用于优雅关闭）
   *
   * @returns {void}
   */
  flush(): void {
    try {
      writeFileSync(this.filePath, Buffer.from(this.database.export()))
    } catch (err) {
      console.error('[db] 落盘失败:', err)
    }
  }
}

/** 全局数据库门面（initDatabase 完成后赋值） */
// eslint-disable-next-line init-declarations
export let db!: SqlFacade

/**
 * 初始化数据库：加载 WASM、读取持久化文件、执行建表
 *
 * @returns {Promise<SqlFacade>} 就绪的数据库门面
 * @throws {Error} WASM 加载、文件读取或建表失败时抛出
 */
export async function initDatabase(): Promise<SqlFacade> {
  try {
    const wasmFile = nodeRequire.resolve('sql.js/dist/sql-wasm.wasm')
    const SQL: SqlJsStatic = await initSqlJs({
      locateFile: () => wasmFile
    })

    mkdirSync(dirname(config.dbPath), { recursive: true })
    const database: Database = existsSync(config.dbPath)
      ? new SQL.Database(readFileSync(config.dbPath))
      : new SQL.Database()

    database.run('PRAGMA foreign_keys = ON')
    database.exec(SCHEMA)

    db = new SqlFacade(database, config.dbPath)
    return db
  } catch (err) {
    throw new Error(
      `数据库初始化失败: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
