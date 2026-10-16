import fs from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';

export interface WriteOptions {
  backup?: boolean;
  spaces?: number;
}

export interface InventoryItemCheck {
  productId: string;
  quantity: number;
  imeis?: string[];
}

/**
 * JsonDatabaseEngine - Core LAN Safe File Database Engine for Thịnh Phát Computer
 * Features:
 * 1. Async Write Queue (Mutex lock per file)
 * 2. Atomic File Swap (.tmp file -> fs.promises.rename to target JSON)
 * 3. Race condition prevention via Atomic Inventory Check & Deduct right before stock deduction
 */
export class JsonDatabaseEngine {
  private static instance: JsonDatabaseEngine;
  private dataDir: string;
  private fileMutexes: Map<string, Mutex> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || process.env.DATA_DIR || path.join(process.cwd(), 'DATASOFT');
    this.ensureDataDir();
  }

  public static getInstance(dataDir?: string): JsonDatabaseEngine {
    if (!JsonDatabaseEngine.instance) {
      JsonDatabaseEngine.instance = new JsonDatabaseEngine(dataDir);
    }
    return JsonDatabaseEngine.instance;
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getMutexForFile(filePath: string): Mutex {
    const normalized = path.resolve(filePath);
    let mutex = this.fileMutexes.get(normalized);
    if (!mutex) {
      mutex = new Mutex();
      this.fileMutexes.set(normalized, mutex);
    }
    return mutex;
  }

  private getCollectionPath(collectionName: string): string {
    return path.join(this.dataDir, `${collectionName}.json`);
  }

  /**
   * Reads a JSON collection safely with backup recovery fallback
   */
  public async readCollection<T = any>(collectionName: string, defaultValue: T[] = []): Promise<T[]> {
    const filePath = this.getCollectionPath(collectionName);
    const mutex = this.getMutexForFile(filePath);
    const release = await mutex.acquire();

    try {
      if (!fs.existsSync(filePath)) {
        return defaultValue;
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const trimmed = content.trim();

      if (!trimmed) {
        // Try recovering from .bak file if primary file is empty
        const backupPath = `${filePath}.bak`;
        if (fs.existsSync(backupPath)) {
          const bakContent = await fs.promises.readFile(backupPath, 'utf8');
          if (bakContent.trim()) {
            const recovered = JSON.parse(bakContent);
            await fs.promises.writeFile(filePath, bakContent, 'utf8');
            return recovered;
          }
        }
        return defaultValue;
      }

      return JSON.parse(trimmed) as T[];
    } catch (error) {
      console.error(`[JsonDatabaseEngine] Error reading ${collectionName}.json:`, error);
      const backupPath = `${filePath}.bak`;
      if (fs.existsSync(backupPath)) {
        try {
          const bakContent = await fs.promises.readFile(backupPath, 'utf8');
          return JSON.parse(bakContent) as T[];
        } catch {}
      }
      return defaultValue;
    } finally {
      release();
    }
  }

  /**
   * Writes a JSON collection atomically using Mutex queue & temp file rename
   */
  public async writeCollection<T = any>(collectionName: string, data: T[], options?: WriteOptions): Promise<void> {
    const filePath = this.getCollectionPath(collectionName);
    const mutex = this.getMutexForFile(filePath);
    const release = await mutex.acquire();

    const shouldBackup = options?.backup ?? true;
    const spaces = options?.spaces ?? 2;

    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const tempPath = `${filePath}.${Date.now()}.${randomSuffix}.tmp`;

    try {
      if (shouldBackup && fs.existsSync(filePath)) {
        const backupPath = `${filePath}.bak`;
        try {
          await fs.promises.copyFile(filePath, backupPath);
        } catch (bErr) {
          console.warn(`[JsonDatabaseEngine] Backup warning for ${collectionName}:`, bErr);
        }
      }

      const jsonString = JSON.stringify(data, null, spaces);
      await fs.promises.writeFile(tempPath, jsonString, 'utf8');
      
      // Atomic rename (file replacement)
      await fs.promises.rename(tempPath, filePath);
    } catch (error) {
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch {}
      }
      console.error(`[JsonDatabaseEngine] Atomic write error for ${collectionName}:`, error);
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Atomic Inventory Check and Stock Deduction
   * Prevents race conditions during simultaneous LAN transactions.
   * Acquires mutexes for both `products.json` and `imeis.json` sequentially in atomic context.
   */
  public async checkAndDeductInventoryAtomic(
    requiredItems: InventoryItemCheck[]
  ): Promise<{ success: boolean; errors?: string[]; updatedProducts?: any[]; updatedImeis?: any[] }> {
    const productsPath = this.getCollectionPath('products');
    const imeisPath = this.getCollectionPath('imeis');

    const productMutex = this.getMutexForFile(productsPath);
    const imeiMutex = this.getMutexForFile(imeisPath);

    // Acquire locks sequentially to avoid deadlock
    const releaseProduct = await productMutex.acquire();
    const releaseImei = await imeiMutex.acquire();

    try {
      // 1. Read current products and IMEIs inside lock
      const productsStr = fs.existsSync(productsPath) ? await fs.promises.readFile(productsPath, 'utf8') : '[]';
      const imeisStr = fs.existsSync(imeisPath) ? await fs.promises.readFile(imeisPath, 'utf8') : '[]';

      const products: any[] = JSON.parse(productsStr || '[]');
      const imeis: any[] = JSON.parse(imeisStr || '[]');

      const errors: string[] = [];

      // 2. Validate availability atomically
      for (const req of requiredItems) {
        const prod = products.find((p: any) => p.id === req.productId);
        if (!prod) {
          errors.push(`Sản phẩm [ID: ${req.productId}] không tồn tại trong kho.`);
          continue;
        }

        if (prod.hasImei) {
          if (!req.imeis || req.imeis.length === 0) {
            errors.push(`Sản phẩm "${prod.name}" yêu cầu mã Serial/IMEI nhưng chưa được cung cấp.`);
            continue;
          }

          // Check if each requested IMEI exists and is in stock
          for (const imeiCode of req.imeis) {
            const imeiRecord = imeis.find(
              (i: any) => i.productId === req.productId && i.imei.toLowerCase() === imeiCode.toLowerCase()
            );

            if (!imeiRecord) {
              errors.push(`Mã IMEI/Serial "${imeiCode}" của sản phẩm "${prod.name}" không tìm thấy trong kho.`);
            } else if (imeiRecord.status !== 'in_stock') {
              errors.push(`Mã IMEI/Serial "${imeiCode}" của sản phẩm "${prod.name}" không ở trạng thái tồn kho (Trạng thái: ${imeiRecord.status}).`);
            }
          }
        } else {
          // Standard stock quantity check
          if (prod.stock < req.quantity) {
            errors.push(
              `Sản phẩm "${prod.name}" không đủ số lượng tồn kho (Yêu cầu: ${req.quantity}, Hiện còn: ${prod.stock}).`
            );
          }
        }
      }

      if (errors.length > 0) {
        return { success: false, errors };
      }

      // 3. Deduct stock and update IMEI status atomically
      for (const req of requiredItems) {
        const prod = products.find((p: any) => p.id === req.productId);
        if (!prod) continue;

        if (prod.hasImei && req.imeis) {
          for (const imeiCode of req.imeis) {
            const imeiRecord = imeis.find(
              (i: any) => i.productId === req.productId && i.imei.toLowerCase() === imeiCode.toLowerCase()
            );
            if (imeiRecord) {
              imeiRecord.status = 'sold';
              imeiRecord.soldAt = new Date().toISOString();
            }
          }
          // Recalculate stock based on remaining in_stock IMEIs
          const remainingInStock = imeis.filter(
            (i: any) => i.productId === prod.id && i.status === 'in_stock'
          ).length;
          prod.stock = remainingInStock;
        } else {
          prod.stock = Math.max(0, prod.stock - req.quantity);
        }
        prod.updatedAt = new Date().toISOString();
      }

      // 4. Save updated products and IMEIs atomically via temp file rename
      const tempProdPath = `${productsPath}.${Date.now()}.tmp`;
      const tempImeiPath = `${imeisPath}.${Date.now()}.tmp`;

      await fs.promises.writeFile(tempProdPath, JSON.stringify(products, null, 2), 'utf8');
      await fs.promises.writeFile(tempImeiPath, JSON.stringify(imeis, null, 2), 'utf8');

      await fs.promises.rename(tempProdPath, productsPath);
      await fs.promises.rename(tempImeiPath, imeisPath);

      return {
        success: true,
        updatedProducts: products,
        updatedImeis: imeis
      };
    } catch (err: any) {
      console.error('[JsonDatabaseEngine] Atomic inventory deduction error:', err);
      return { success: false, errors: [`Lỗi hệ thống kho dữ liệu: ${err.message}`] };
    } finally {
      releaseImei();
      releaseProduct();
    }
  }
}

export default JsonDatabaseEngine;
