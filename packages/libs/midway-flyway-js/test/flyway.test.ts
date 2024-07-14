import {Flyway} from "../src/flyway";
import {DataSource} from 'typeorm';
import * as fs from 'fs'
import {FlywayHistory} from "../src/entity";

const dbPath = "./data/db.sqlite"
const AppDataSource = new DataSource({
  type: "sqlite",
  database: dbPath,
  entities: [FlywayHistory]
})

describe('test/flyway/flyway.test.ts', () => {

  beforeEach(async () => {
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath)
    }
    await  AppDataSource.initialize()
    console.log('before each')
  });

  afterEach(async () => {
    // close app
    await AppDataSource.destroy()
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath)
    }
    console.log('after each')
  });

  /**
   * sql分割测试
   */
  it('split', async () => {
    let opts = {
      scriptDir: "./test/db/split"
    };
    const content = fs.readFileSync("./test/db/split/split.sql").toString();
    const sqlArray = new Flyway(opts).splitSql2Array(content)
    console.log('sql array',sqlArray)
    expect(sqlArray.length).toBe(1);
  });

  /**
   * sql分号测试
   */
  it('semicolon', async () => {
    const connection = AppDataSource
    let opts = {
      scriptDir: "./test/db/semicolon",
      connection: connection
    };
    await new Flyway(opts).run();
    const queryRunner = connection.createQueryRunner();
    const flywayHistoryRet = await queryRunner.query("select *  from flyway_history");
    console.log('flywayHistoryRet', flywayHistoryRet)
    expect(flywayHistoryRet.length).toBe(1);
  });

  /**
   * 正常执行
   */
  it('success', async () => {
    const connection = AppDataSource
    let opts = {
      scriptDir: "./test/db/migration",
      connection: connection
    };
    await new Flyway(opts).run();
    const queryRunner = connection.createQueryRunner();
    const ret = await queryRunner.query("select count(*) as count from sys_user");
    console.log('useCount',ret)
    expect(ret[0].count).toBe(4);

    const flywayHistoryRet = await queryRunner.query("select *  from flyway_history");
    console.log('flywayHistoryRet',flywayHistoryRet)
    expect(flywayHistoryRet.length).toBe(3);
    expect(flywayHistoryRet[0].id).toBe(1);
    expect(flywayHistoryRet[0].success).toBe(1);
    expect(flywayHistoryRet[0].name).toBe('v1__init.sql');

    //再运行一次，应该没有变化
    await new Flyway(opts).run();
    const flywayHistoryRet2 = await queryRunner.query("select *  from flyway_history");
    expect(flywayHistoryRet.length).toBe(3);
    expect(flywayHistoryRet2[0].id).toBe(1);

  });


  /**
   * 测试基准线，基准线之前的sql不执行
   */
  it('base line', async () => {
    const connection = AppDataSource
    let opts = {
      scriptDir: "./test/db/baseline",
      baseline: 'v0__baseline.sql',
      connection
    };
    try {
      await new Flyway(opts).run();
    } catch (e) {
      console.log('error',e)
      throw e
    }
    const queryRunner = connection.createQueryRunner();
    const ret = await queryRunner.query("select count(*) as count from sys_user");
    console.log('useCount', ret)
    expect(ret[0].count).toBe(2);

    const flywayHistoryRet = await queryRunner.query("select *  from flyway_history");
    console.log('flywayHistoryRet', flywayHistoryRet)
    expect(flywayHistoryRet.length).toBe(2);
    expect(flywayHistoryRet[0].id).toBe(1);
    expect(flywayHistoryRet[0].success).toBe(1);
    expect(flywayHistoryRet[0].name).toBe('v0__baseline.sql');
    expect(flywayHistoryRet[1].name).toBe('v1__init.sql');

  });

  it('hash check', async () => {
    const connection = AppDataSource;
    let opts = {
      scriptDir: "./test/db/migration",
      connection
    };
    await new Flyway(opts).run();
    const queryRunner = connection.createQueryRunner();
    const ret = await queryRunner.query("select count(*) as count from sys_user");
    console.log('useCount',ret)
    expect(ret[0].count).toBe(4);

    //再运行一次，应该抛异常
    let error
    try{
      opts.scriptDir="./test/db/hash-check"
      await new Flyway(opts).run();
    }catch (e){
      error = e.message;
    }
    expect(error).toContain('hash conflict');

  });


  it('blank sql', async () => {
    const connection = AppDataSource;
    let opts = {
      scriptDir: "./test/db/blank",
      connection
    };
    await new Flyway(opts).run();

    const queryRunner = connection.createQueryRunner();
    const flywayHistoryRet = await queryRunner.query("select *  from flyway_history");
    console.log('flywayHistoryRet', flywayHistoryRet)
    expect(flywayHistoryRet.length).toBe(1);

  });

});
