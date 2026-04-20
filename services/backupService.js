import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

class BackupService {
  constructor() {
    this.backupDir = join(process.cwd(), 'data');
    mkdirSync(this.backupDir, { recursive: true });
  }

  async saveBackup(reportId, data) {
    const filePath = join(this.backupDir, `${reportId}.json`);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`📁 Backup saved: ${filePath}`);
    return filePath;
  }
}

export default new BackupService();