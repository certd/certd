import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from '@certd/pipeline';
import fs from 'fs';
import path from 'path';
import dayjs from 'dayjs';
import { SshAccess, SshClient } from '../../plugin-host/index.js';
import { AbstractPlusTaskPlugin } from '@certd/plugin-plus';

const defaultBackupDir = 'certd_backup';
const defaultFilePrefix = 'db-backup';
@IsTaskPlugin({
  name: 'DBBackupPlugin',
  title: '数据库备份',
  icon: 'ri:rest-time-line',
  desc: '仅支持备份SQLite数据库',
  group: pluginGroups.other.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.AlwaysRun,
    },
  },
  needPlus: true,
})
export class DBBackupPlugin extends AbstractPlusTaskPlugin {
  @TaskInput({
    title: '备份方式',
    value: 'local',
    component: {
      name: 'a-select',
      options: [
        { label: '本地复制', value: 'local' },
        { label: 'ssh上传', value: 'ssh' },
      ],
      placeholder: '',
    },
    helper: '支持本地复制、ssh上传',
    required: true,
  })
  backupMode = 'local';

  @TaskInput({
    title: '主机登录授权',
    component: {
      name: 'access-selector',
      type: 'ssh',
    },
    mergeScript: `
      return {
         show:ctx.compute(({form})=>{
          return form.backupMode === 'ssh';
        })
      }
    `,
    required: true,
  })
  sshAccessId!: number;

  @TaskInput({
    title: '备份保存目录',
    component: {
      name: 'a-input',
      type: 'value',
      placeholder: `默认${defaultBackupDir}`,
    },
    helper: `ssh方式默认保存在当前用户的${defaultBackupDir}目录下，本地方式默认保存在data/${defaultBackupDir}目录下，也可以填写绝对路径`,
    required: false,
  })
  backupDir: string = defaultBackupDir;

  @TaskInput({
    title: '备份文件前缀',
    component: {
      name: 'a-input',
      vModel: 'value',
      placeholder: `默认${defaultFilePrefix}`,
    },
    required: false,
  })
  filePrefix: string = defaultFilePrefix;

  @TaskInput({
    title: '删除过期备份',
    component: {
      name: 'a-input-number',
      vModel: 'value',
      placeholder: '20',
    },
    helper: '删除多少天前的备份,不填则不删除',
    required: false,
  })
  retainDays!: number;

  async onInstance() {}
  async execute(): Promise<void> {
    this.logger.info('开始备份数据库');

    let dbPath = process.env.certd_typeorm_dataSource_default_database;
    dbPath = dbPath || './data/db.sqlite';
    if (!fs.existsSync(dbPath)) {
      this.logger.error('数据库文件不存在：', dbPath);
      return;
    }

    this.logger.info('当前备份方式：', this.backupMode);
    const backupDir = this.backupDir || defaultBackupDir;
    const backupFile = `${backupDir}/${this.filePrefix}.${dayjs().format('YYYYMMDD.HHmmss')}.sqlite`;

    if (this.backupMode === 'local') {
      await this.localBackup(dbPath, backupDir, backupFile);
    } else if (this.backupMode === 'ssh') {
      await this.sshBackup(dbPath, backupDir, backupFile);
    } else if (this.backupMode === 'oss') {
      await this.ossBackup(dbPath, backupDir, backupFile);
    } else {
      throw new Error(`不支持的备份方式:${this.backupMode}`);
    }

    this.logger.info('数据库备份完成');
  }

  private async localBackup(dbPath: string, backupDir: string, backupPath: string) {
    if (!backupPath.startsWith('/')) {
      backupPath = path.join('./data/', backupPath);
    }
    const dir = path.dirname(backupPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    backupPath = path.resolve(backupPath);
    await fs.promises.copyFile(dbPath, backupPath);
    this.logger.info('备份文件路径：', backupPath);

    if (this.retainDays > 0) {
      // 删除过期备份
      this.logger.info('开始删除过期备份文件');
      const files = fs.readdirSync(dir);
      const now = Date.now();
      let count = 0;
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > this.retainDays * 24 * 60 * 60 * 1000) {
          fs.unlinkSync(filePath as fs.PathLike);
          count++;
          this.logger.info('删除过期备份文件：', filePath);
        }
      });
      this.logger.info('删除过期备份文件数:', count);
    }
  }

  private async sshBackup(dbPath: string, backupDir: string, backupPath: string) {
    const access: SshAccess = await this.ctx.accessService.getById(this.sshAccessId);
    const sshClient = new SshClient(this.logger);
    this.logger.info('备份目录：', backupPath);
    await sshClient.uploadFiles({
      connectConf: access,
      transports: [{ localPath: dbPath, remotePath: backupPath }],
      mkdirs: true,
    });
    this.logger.info('备份文件上传完成');

    if (this.retainDays > 0) {
      // 删除过期备份
      this.logger.info('开始删除过期备份文件');
      const isWin = access.windows;
      let script: string[] = [];
      if (isWin) {
        throw new Error('删除过期文件暂不支持windows系统');
        // script = `forfiles /p ${backupDir} /s /d -${this.retainDays} /c "cmd /c del @path"`;
      } else {
        script = [`cd ${backupDir}`, 'echo 备份目录', 'pwd', `find . -type f -mtime +${this.retainDays} -name '${this.filePrefix}*' -exec rm -f {} \\;`];
      }

      await sshClient.exec({
        connectConf: access,
        script,
      });
      this.logger.info('删除过期备份文件完成');
    }
  }

  private async ossBackup(dbPath: string, backupDir: string, backupPath: string) {
    // TODO
  }
}
new DBBackupPlugin();
