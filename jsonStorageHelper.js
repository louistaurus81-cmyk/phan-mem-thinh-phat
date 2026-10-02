import fs from "fs";
import path from "path";
import { Mutex } from "async-mutex";

const fileMutexMap = new Map();

export function getFileMutex(filePath) {
  const normalizedPath = path.resolve(filePath);
  let mutex = fileMutexMap.get(normalizedPath);
  if (!mutex) {
    mutex = new Mutex();
    fileMutexMap.set(normalizedPath, mutex);
  }
  return mutex;
}

export async function createBackup(filePath, backupExt = ".bak") {
  const normalizedPath = path.resolve(filePath);
  if (!fs.existsSync(normalizedPath)) {
    return null;
  }

  const backupPath = `${normalizedPath}${backupExt}`;
  try {
    await fs.promises.copyFile(normalizedPath, backupPath);
    return backupPath;
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi tạo backup cho ${normalizedPath}:`, error);
    return null;
  }
}

export function createBackupSync(filePath, backupExt = ".bak") {
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

export async function readJSON(filePath, defaultValue = []) {
  const normalizedPath = path.resolve(filePath);
  const mutex = getFileMutex(normalizedPath);
  const release = await mutex.acquire();

  try {
    if (!fs.existsSync(normalizedPath)) {
      return defaultValue;
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
          await fs.promises.writeFile(normalizedPath, backupContent, "utf8");
          console.log(`[jsonStorageHelper] Đã khôi phục thành công ${path.basename(normalizedPath)} từ bản backup!`);
          return recovered;
        }
      }
      return defaultValue;
    }

    return JSON.parse(trimmed);
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi đọc file ${normalizedPath}:`, error);
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
    return defaultValue;
  } finally {
    release();
  }
}

export function readJSONSync(filePath, defaultValue = []) {
  const normalizedPath = path.resolve(filePath);
  try {
    if (!fs.existsSync(normalizedPath)) {
      return defaultValue;
    }

    const content = fs.readFileSync(normalizedPath, "utf8");
    const trimmed = content.trim();

    if (!trimmed) {
      const backupPath = `${normalizedPath}.bak`;
      if (fs.existsSync(backupPath)) {
        const backupContent = fs.readFileSync(backupPath, "utf8");
        if (backupContent.trim()) {
          fs.writeFileSync(normalizedPath, backupContent, "utf8");
          return JSON.parse(backupContent);
        }
      }
      return defaultValue;
    }

    return JSON.parse(trimmed);
  } catch (error) {
    console.error(`[jsonStorageHelper] Lỗi khi đọc Sync ${normalizedPath}:`, error);
    const backupPath = `${normalizedPath}.bak`;
    if (fs.existsSync(backupPath)) {
      try {
        const backupContent = fs.readFileSync(backupPath, "utf8");
        return JSON.parse(backupContent);
      } catch {}
    }
    return defaultValue;
  }
}

export async function writeJSONSafe(filePath, data, options = {}) {
  const normalizedPath = path.resolve(filePath);
  const mutex = getFileMutex(normalizedPath);
  const release = await mutex.acquire();

  const shouldBackup = options.backup !== undefined ? options.backup : true;
  const backupExt = options.backupExt || ".bak";
  const spaces = options.spaces !== undefined ? options.spaces : 2;
  const shouldCreateDir = options.createDir !== undefined ? options.createDir : true;

  const dirName = path.dirname(normalizedPath);
  if (shouldCreateDir && !fs.existsSync(dirName)) {
    await fs.promises.mkdir(dirName, { recursive: true });
  }

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

    // 4. Atomic Replace: Đổi tên file tạm đè lên file chính (Rename nguyên tử)
    await fs.promises.rename(tempPath, normalizedPath);
  } catch (error) {
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

export function writeJSONSafeSync(filePath, data, options = {}) {
  const normalizedPath = path.resolve(filePath);
  const shouldBackup = options.backup !== undefined ? options.backup : true;
  const backupExt = options.backupExt || ".bak";
  const spaces = options.spaces !== undefined ? options.spaces : 2;
  const shouldCreateDir = options.createDir !== undefined ? options.createDir : true;

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
