import fs from "fs";
import path from "path";
import { Mutex } from "async-mutex";

/**
 * Interface cho các tùy chọn khi ghi file an toàn
 */
export interface WriteSafeOptions {
  /** Tự động tạo bản sao lưu (.bak) trước khi ghi đè (Mặc định: true) */
  backup?: boolean;
  /** Đuôi mở rộng cho file backup (Mặc định: '.bak') */
  backupExt?: string;
  /** Số khoảng trắng thụt đầu dòng khi format JSON (Mặc định: 2) */
  spaces?: number;
  /** Tự động tạo thư mục cha nếu chưa tồn tại (Mặc định: true) */
  createDir?: boolean;
}

// Bảng lưu trữ Mutex theo từng đường dẫn file để tránh xung đột khi nhiều tiến trình ghi đồng thời
const fileMutexMap = new Map<string, Mutex>();

/**
 * Lấy hoặc tạo mới Mutex cho một file cụ thể
 * Đảm bảo chỉ có 1 thao tác ghi/đọc nhạy cảm vào file này tại 1 thời điểm
 */
export function getFileMutex(filePath: string): Mutex {
  const normalizedPath = path.resolve(filePath);
  let mutex = fileMutexMap.get(normalizedPath);
  if (!mutex) {
    mutex = new Mutex();
    fileMutexMap.set(normalizedPath, mutex);
  }
  return mutex;
}

/**
 * Tạo bản sao lưu (.bak) an toàn cho file dữ liệu
 * Thường được gọi trước khi thực hiện các thao tác lớn: Xóa, Sửa hàng loạt, Ghi đè
 * @param filePath Đường dẫn file nguồn
 * @param backupExt Đuôi mở rộng (.bak)
 * @returns Đường dẫn file backup được tạo hoặc null nếu file nguồn chưa tồn tại
 */
export async function createBackup(
  filePath: string,
  backupExt: string = ".bak"
): Promise<string | null> {
  const normalizedPath = path.resolve(filePath);
  if (!fs.existsSync(normalizedPath)) {
    return null;
  }

  const backupPath = `${normalizedPath}${backupExt}`;
  try {
    // Sử dụng copyFile để tạo bản sao lưu độc lập
    await fs.promises.copyFile(normalizedPath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi tạo backup cho ${normalizedPath}:`, error);
    return null;
  }
}

/**
 * Phiên bản đồng bộ tạo bản sao lưu (.bak)
 */
export function createBackupSync(
  filePath: string,
  backupExt: string = ".bak"
): string | null {
  const normalizedPath = path.resolve(filePath);
  if (!fs.existsSync(normalizedPath)) {
    return null;
  }

  const backupPath = `${normalizedPath}${backupExt}`;
  try {
    fs.copyFileSync(normalizedPath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi tạo backup (Sync) cho ${normalizedPath}:`, error);
    return null;
  }
}

/**
 * Đọc file JSON an toàn với khả năng tự phục hồi nếu file bị lỗi hoặc rỗng
 * @param filePath Đường dẫn file JSON
 * @param defaultValue Giá trị mặc định nếu file không tồn tại hoặc lỗi (Mặc định: [] hoặc {})
 */
export async function readJSON<T = any>(
  filePath: string,
  defaultValue?: T
): Promise<T> {
  const normalizedPath = path.resolve(filePath);
  const mutex = getFileMutex(normalizedPath);
  const release = await mutex.acquire();

  try {
    if (!fs.existsSync(normalizedPath)) {
      return (defaultValue ?? ([] as unknown)) as T;
    }

    const content = await fs.promises.readFile(normalizedPath, "utf8");
    const trimmed = content.trim();

    if (!trimmed) {
      console.warn(`[jsonStorageHelper] File ${path.basename(normalizedPath)} rỗng, đang thử khôi phục từ .bak...`);
      const backupPath = `${normalizedPath}.bak`;
      if (fs.existsSync(backupPath)) {
        const backupContent = await fs.promises.readFile(backupPath, "utf8");
        if (backupContent.trim()) {
          const recovered = JSON.parse(backupContent);
          // Tự động khôi phục lại file chính
          await fs.promises.writeFile(normalizedPath, backupContent, "utf8");
          console.log(`[jsonStorageHelper] Đã khôi phục thành công ${path.basename(normalizedPath)} từ bản backup!`);
          return recovered;
        }
      }
      return (defaultValue ?? ([] as unknown)) as T;
    }

    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi đọc file ${normalizedPath}:`, error);
    // Cố gắng phục hồi từ file backup nếu JSON bị corrupt
    const backupPath = `${normalizedPath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const backupContent = await fs.promises.readFile(backupPath, "utf8");
        const recovered = JSON.parse(backupContent);
        console.log(`[jsonStorageHelper] Đã cứu hộ dữ liệu thành công từ file backup ${path.basename(backupPath)}!`);
        return recovered;
      } catch (backupErr) {
        console.error(`[jsonStorageHelper] File backup cũng không đọc được:`, backupErr);
      }
    }
    return (defaultValue ?? ([] as unknown)) as T;
  } finally {
    release();
  }
}

/**
 * Phiên bản đọc JSON đồng bộ (dùng khi khởi động ứng dụng)
 */
export function readJSONSync<T = any>(
  filePath: string,
  defaultValue?: T
): T {
  const normalizedPath = path.resolve(filePath);
  try {
    if (!fs.existsSync(normalizedPath)) {
      return (defaultValue ?? ([] as unknown)) as T;
    }

    const content = fs.readFileSync(normalizedPath, "utf8");
    const trimmed = content.trim();

    if (!trimmed) {
      const backupPath = `${normalizedPath}.bak`;
      if (fs.existsSync(backupPath)) {
        const backupContent = fs.readFileSync(backupPath, "utf8");
        if (backupContent.trim()) {
          fs.writeFileSync(normalizedPath, backupContent, "utf8");
          return JSON.parse(backupContent) as T;
        }
      }
      return (defaultValue ?? ([] as unknown)) as T;
    }

    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi đọc Sync ${normalizedPath}:`, error);
    const backupPath = `${normalizedPath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const backupContent = fs.readFileSync(backupPath, "utf8");
        return JSON.parse(backupContent) as T;
      } catch {}
    }
    return (defaultValue ?? ([] as unknown)) as T;
  }
}

/**
 * Ghi dữ liệu JSON theo tiêu chuẩn Nguyên tử (Atomic Write) & Hàng đợi Mutex:
 * 1. Khóa Mutex cho file để tránh ghi đè đồng thời.
 * 2. Tự động tạo bản sao lưu (.bak) của dữ liệu cũ trước khi ghi.
 * 3. Ghi dữ liệu ra file tạm (.tmp) cùng thư mục.
 * 4. Sử dụng fs.rename() để đổi tên file tạm thành file chính (Atomic swap trên OS).
 * 5. Đảm bảo file không bao giờ bị rỗng hay lỗi nếu mất điện đột ngột.
 * 
 * @param filePath Đường dẫn file JSON mục tiêu
 * @param data Dữ liệu cần lưu
 * @param options Tùy chọn cấu hình (backup, spaces, createDir)
 */
export async function writeJSONSafe<T = any>(
  filePath: string,
  data: T,
  options?: WriteSafeOptions
): Promise<void> {
  const normalizedPath = path.resolve(filePath);
  const mutex = getFileMutex(normalizedPath);
  const release = await mutex.acquire();

  const shouldBackup = options?.backup ?? true;
  const backupExt = options?.backupExt ?? ".bak";
  const spaces = options?.spaces ?? 2;
  const shouldCreateDir = options?.createDir ?? true;

  const dirName = path.dirname(normalizedPath);
  if (shouldCreateDir && !fs.existsSync(dirName)) {
    await fs.promises.mkdir(dirName, { recursive: true });
  }

  // Tạo tên file tạm độc nhất trong cùng thư mục (cùng filesystem để đảm bảo rename là atomic)
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tempPath = `${normalizedPath}.${Date.now()}.${randomSuffix}.tmp`;

  try {
    // 1. Tự động sao lưu dữ liệu hiện tại trước khi ghi đè nếu file đã tồn tại
    if (shouldBackup && fs.existsSync(normalizedPath)) {
      const backupPath = `${normalizedPath}${backupExt}`;
      try {
        await fs.promises.copyFile(normalizedPath, backupPath);
      } catch (backupError) {
        console.warn(`[jsonStorageHelper] Cảnh báo: Không thể tạo backup trước khi ghi cho ${path.basename(normalizedPath)}:`, backupError);
      }
    }

    // 2. Chuẩn bị chuỗi JSON hợp lệ
    const jsonString = JSON.stringify(data, null, spaces);

    // 3. Ghi dữ liệu vào file tạm (.tmp)
    await fs.promises.writeFile(tempPath, jsonString, "utf8");

    // 4. Atomic Replace: Đổi tên file tạm đè lên file chính
    // Trên các hệ điều hành POSIX và Windows NTFS, rename là thao tác nguyên tử trong cùng phân vùng
    await fs.promises.rename(tempPath, normalizedPath);
  } catch (error) {
    // Xóa file tạm nếu thao tác gặp sự cố
    if (fs.existsSync(tempPath)) {
      try {
        await fs.promises.unlink(tempPath);
      } catch {}
    }
    console.error(`[jsonStorageHelper] Lỗi ghi file nguyên tử cho ${normalizedPath}:`, error);
    throw error;
  } finally {
    release();
  }
}

/**
 * Phiên bản ghi đồng bộ với Atomic Write và sao lưu tự động
 */
export function writeJSONSafeSync<T = any>(
  filePath: string,
  data: T,
  options?: WriteSafeOptions
): void {
  const normalizedPath = path.resolve(filePath);
  const shouldBackup = options?.backup ?? true;
  const backupExt = options?.backupExt ?? ".bak";
  const spaces = options?.spaces ?? 2;
  const shouldCreateDir = options?.createDir ?? true;

  const dirName = path.dirname(normalizedPath);
  if (shouldCreateDir && !fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, { recursive: true });
  }

  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tempPath = `${normalizedPath}.${Date.now()}.${randomSuffix}.tmp`;

  try {
    if (shouldBackup && fs.existsSync(normalizedPath)) {
      const backupPath = `${normalizedPath}${backupExt}`;
      try {
        fs.copyFileSync(normalizedPath, backupPath);
      } catch {}
    }

    const jsonString = JSON.stringify(data, null, spaces);
    fs.writeFileSync(tempPath, jsonString, "utf8");
    fs.renameSync(tempPath, normalizedPath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    throw error;
  }
}

export default {
  readJSON,
  readJSONSync,
  writeJSONSafe,
  writeJSONSafeSync,
  createBackup,
  createBackupSync,
  getFileMutex
};
