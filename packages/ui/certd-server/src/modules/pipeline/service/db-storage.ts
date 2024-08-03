import { IStorage } from '@certd/pipeline';
import { StorageService } from './storage-service.js';

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

  async remove(scope: string, namespace: string, version: string, key: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async get(scope: string, namespace: string, version: string, key: string): Promise<string | null> {
    const storageEntity = await this.storageService.get({
      userId: this.userId,
      scope: scope,
      namespace: namespace,
      version,
      key,
    });

    if (storageEntity != null) {
      return storageEntity.value;
    }
    return null;
  }

  async set(scope: string, namespace: string, version: string, key: string, value: string): Promise<void> {
    await this.storageService.set({
      userId: this.userId,
      scope: scope,
      namespace: namespace,
      version,
      key,
      value,
    });
  }
}
