import { EntityManager } from "typeorm";

let sqliteQueue: Promise<unknown> = Promise.resolve();

/**
 * SQLite 同一连接不能并发开启事务；在单进程内串行化。
 * PostgreSQL/MySQL 保持正常并发事务。
 */
export async function runTransaction<T>(manager: EntityManager, fn: (tx: EntityManager) => Promise<T>): Promise<T> {
  const driverType = String(manager.connection?.options?.type || "");
  if (!driverType.includes("sqlite")) {
    return await manager.transaction(fn);
  }
  const run = sqliteQueue.catch(() => undefined).then(() => manager.transaction(fn));
  sqliteQueue = run.catch(() => undefined);
  return await run;
}
