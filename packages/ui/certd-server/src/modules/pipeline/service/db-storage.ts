import { IStorage } from '@certd/pipeline/src/core/storage';
import { StorageService } from './storage-service';

export class DbStorage implements IStorage {
  /**
   * 范围： user / pipeline / runtime / task
   */
  storageService: StorageService;
  userId: number;
  constructor(userId: number, storageService: StorageService) {
    this.userId = userId;
    this.storageService = storageService;
  }

  async get(
    scope: string,
    namespace: string,
    key: string
  ): Promise<string | null> {
    const storageEntity = await this.storageService.get({
      userId: this.userId,
      scope: scope,
      namespace: namespace,
      key,
    });

    if (storageEntity != null) {
      return storageEntity.value;
    }
    return null;
  }

  async set(
    scope: string,
    namespace: string,
    key: string,
    value: string
  ): Promise<void> {
    await this.storageService.set({
      userId: this.userId,
      scope: scope,
      namespace: namespace,
      key,
      value,
    });
  }
}
