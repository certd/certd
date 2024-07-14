"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var flyway_1 = require("../src/flyway");
var typeorm_1 = require("typeorm");
var fs = require("fs");
var entity_1 = require("../src/entity");
var dbPath = "./data/db.sqlite";
var AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: dbPath,
    entities: [entity_1.FlywayHistory]
});
describe('test/flyway/flyway.test.ts', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (fs.existsSync(dbPath)) {
                        fs.rmSync(dbPath);
                    }
                    return [4 /*yield*/, AppDataSource.initialize()];
                case 1:
                    _a.sent();
                    console.log('before each');
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // close app
                return [4 /*yield*/, AppDataSource.destroy()];
                case 1:
                    // close app
                    _a.sent();
                    if (fs.existsSync(dbPath)) {
                        fs.rmSync(dbPath);
                    }
                    console.log('after each');
                    return [2 /*return*/];
            }
        });
    }); });
    /**
     * sql分割测试
     */
    it('split', function () { return __awaiter(void 0, void 0, void 0, function () {
        var opts, content, sqlArray;
        return __generator(this, function (_a) {
            opts = {
                scriptDir: "./test/db/split"
            };
            content = fs.readFileSync("./test/db/split/split.sql").toString();
            sqlArray = new flyway_1.Flyway(opts).splitSql2Array(content);
            console.log('sql array', sqlArray);
            expect(sqlArray.length).toBe(1);
            return [2 /*return*/];
        });
    }); });
    /**
     * sql分号测试
     */
    it('semicolon', function () { return __awaiter(void 0, void 0, void 0, function () {
        var connection, opts, queryRunner, flywayHistoryRet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = AppDataSource;
                    opts = {
                        scriptDir: "./test/db/semicolon",
                        connection: connection
                    };
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 1:
                    _a.sent();
                    queryRunner = connection.createQueryRunner();
                    return [4 /*yield*/, queryRunner.query("select *  from flyway_history")];
                case 2:
                    flywayHistoryRet = _a.sent();
                    console.log('flywayHistoryRet', flywayHistoryRet);
                    expect(flywayHistoryRet.length).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    /**
     * 正常执行
     */
    it('success', function () { return __awaiter(void 0, void 0, void 0, function () {
        var connection, opts, queryRunner, ret, flywayHistoryRet, flywayHistoryRet2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = AppDataSource;
                    opts = {
                        scriptDir: "./test/db/migration",
                        connection: connection
                    };
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 1:
                    _a.sent();
                    queryRunner = connection.createQueryRunner();
                    return [4 /*yield*/, queryRunner.query("select count(*) as count from sys_user")];
                case 2:
                    ret = _a.sent();
                    console.log('useCount', ret);
                    expect(ret[0].count).toBe(4);
                    return [4 /*yield*/, queryRunner.query("select *  from flyway_history")];
                case 3:
                    flywayHistoryRet = _a.sent();
                    console.log('flywayHistoryRet', flywayHistoryRet);
                    expect(flywayHistoryRet.length).toBe(3);
                    expect(flywayHistoryRet[0].id).toBe(1);
                    expect(flywayHistoryRet[0].success).toBe(1);
                    expect(flywayHistoryRet[0].name).toBe('v1__init.sql');
                    //再运行一次，应该没有变化
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 4:
                    //再运行一次，应该没有变化
                    _a.sent();
                    return [4 /*yield*/, queryRunner.query("select *  from flyway_history")];
                case 5:
                    flywayHistoryRet2 = _a.sent();
                    expect(flywayHistoryRet.length).toBe(3);
                    expect(flywayHistoryRet2[0].id).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
    /**
     * 测试基准线，基准线之前的sql不执行
     */
    it('base line', function () { return __awaiter(void 0, void 0, void 0, function () {
        var connection, opts, e_1, queryRunner, ret, flywayHistoryRet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = AppDataSource;
                    opts = {
                        scriptDir: "./test/db/baseline",
                        baseline: 'v0__baseline.sql',
                        connection: connection
                    };
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.log('error', e_1);
                    throw e_1;
                case 4:
                    queryRunner = connection.createQueryRunner();
                    return [4 /*yield*/, queryRunner.query("select count(*) as count from sys_user")];
                case 5:
                    ret = _a.sent();
                    console.log('useCount', ret);
                    expect(ret[0].count).toBe(2);
                    return [4 /*yield*/, queryRunner.query("select *  from flyway_history")];
                case 6:
                    flywayHistoryRet = _a.sent();
                    console.log('flywayHistoryRet', flywayHistoryRet);
                    expect(flywayHistoryRet.length).toBe(2);
                    expect(flywayHistoryRet[0].id).toBe(1);
                    expect(flywayHistoryRet[0].success).toBe(1);
                    expect(flywayHistoryRet[0].name).toBe('v0__baseline.sql');
                    expect(flywayHistoryRet[1].name).toBe('v1__init.sql');
                    return [2 /*return*/];
            }
        });
    }); });
    it('hash check', function () { return __awaiter(void 0, void 0, void 0, function () {
        var connection, opts, queryRunner, ret, error, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = AppDataSource;
                    opts = {
                        scriptDir: "./test/db/migration",
                        connection: connection
                    };
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 1:
                    _a.sent();
                    queryRunner = connection.createQueryRunner();
                    return [4 /*yield*/, queryRunner.query("select count(*) as count from sys_user")];
                case 2:
                    ret = _a.sent();
                    console.log('useCount', ret);
                    expect(ret[0].count).toBe(4);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    opts.scriptDir = "./test/db/hash-check";
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 4:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    e_2 = _a.sent();
                    error = e_2.message;
                    return [3 /*break*/, 6];
                case 6:
                    expect(error).toContain('hash conflict');
                    return [2 /*return*/];
            }
        });
    }); });
    it('blank sql', function () { return __awaiter(void 0, void 0, void 0, function () {
        var connection, opts, queryRunner, flywayHistoryRet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    connection = AppDataSource;
                    opts = {
                        scriptDir: "./test/db/blank",
                        connection: connection
                    };
                    return [4 /*yield*/, new flyway_1.Flyway(opts).run()];
                case 1:
                    _a.sent();
                    queryRunner = connection.createQueryRunner();
                    return [4 /*yield*/, queryRunner.query("select *  from flyway_history")];
                case 2:
                    flywayHistoryRet = _a.sent();
                    console.log('flywayHistoryRet', flywayHistoryRet);
                    expect(flywayHistoryRet.length).toBe(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
