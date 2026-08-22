import assert from "node:assert/strict";

import yaml from "js-yaml";
import { canEditStorePlugin, getPluginFullName, isOnlinePluginUpgradeAvailable, parseOnlinePluginFullName, PluginService } from "./plugin-service.js";

type RepoOptions = {
  marketRows?: any[];
  installedRows?: any[];
  queryRows?: any[];
  existingStoreRows?: any[];
};

function createPluginRepositoryMock(options: RepoOptions = {}) {
  const state = {
    savedRows: [] as any[],
    updates: [] as any[],
    findCalls: 0,
    queryRows: options.queryRows || options.marketRows || [],
    installedRows: options.installedRows || [],
    existingStoreRows: options.existingStoreRows || [],
  };

  function buildQueryBuilder() {
    const flags: {
      storeOnly: boolean;
      installedOnly: boolean;
      notBuiltIn: boolean;
      keyword: string;
      fullName: string;
      author: string;
      name: string;
      pluginType: string;
      whereQuery: Record<string, any>;
      offset: number;
      limit?: number;
    } = {
      storeOnly: false,
      installedOnly: false,
      notBuiltIn: false,
      keyword: "",
      fullName: "",
      author: "",
      name: "",
      pluginType: "",
      whereQuery: {},
      offset: 0,
    };

    function getFilteredList(options?: { paginate?: boolean }) {
      let list = (state.savedRows.length ? state.savedRows : state.queryRows).slice();
      for (const key of Object.keys(flags.whereQuery)) {
        list = list.filter(item => item[key] === flags.whereQuery[key]);
      }
      if (flags.notBuiltIn) {
        list = list.filter(item => item.type !== "builtIn");
      }
      if (flags.storeOnly) {
        list = list.filter(item => item.type === "store");
      }
      if (flags.installedOnly) {
        list = list.filter(item => item.type !== "store" || item.installed === true);
      }
      if (flags.keyword) {
        const keyword = flags.keyword.toLowerCase();
        list = list.filter(item => {
          const searchable = [item.fullName, item.author, item.name, item.title, item.desc, item.group, item.pluginType].filter(Boolean).join(" ").toLowerCase();
          return searchable.includes(keyword);
        });
      }
      if (!options?.paginate) {
        return list;
      }
      return list.slice(flags.offset, flags.limit == null ? undefined : flags.offset + flags.limit);
    }

    const builder = {
      where(expr: any, params?: any) {
        applyExpr(expr, params);
        return builder;
      },
      andWhere(expr: any, params?: any) {
        applyExpr(expr, params);
        return builder;
      },
      orWhere(expr: any, params?: any) {
        applyExpr(expr, params);
        return builder;
      },
      orderBy() {
        return builder;
      },
      addOrderBy() {
        return builder;
      },
      offset(value: number) {
        flags.offset = value;
        return builder;
      },
      limit(value: number) {
        flags.limit = value;
        return builder;
      },
      setFindOptions() {
        return builder;
      },
      getMany() {
        return getFilteredList({ paginate: true });
      },
      getCount() {
        return getFilteredList().length;
      },
      getOne() {
        return (
          state.installedRows.find(item => {
            if (item.type !== "store") {
              return false;
            }
            if (item.installed !== true) {
              return false;
            }
            if (flags.fullName && item.fullName !== flags.fullName && `${item.author || ""}/${item.name || ""}` !== flags.fullName && item.name !== flags.fullName) {
              return false;
            }
            if (flags.author && item.author !== flags.author) {
              return false;
            }
            if (flags.name && item.name !== flags.name) {
              return false;
            }
            if (flags.pluginType && item.pluginType !== flags.pluginType) {
              return false;
            }
            return true;
          }) || null
        );
      },
    };

    function applyExpr(expr: any, params?: any) {
      if (typeof expr?.whereFactory === "function") {
        expr.whereFactory(builder);
        return;
      }
      if (expr && typeof expr === "object") {
        flags.whereQuery = { ...flags.whereQuery, ...expr };
        return;
      }
      if (typeof expr !== "string") {
        return;
      }
      if (expr.includes("type != :type") && params?.type === "builtIn") {
        flags.notBuiltIn = true;
      }
      if (expr.includes("item.type = :type") && params?.type === "store") {
        flags.storeOnly = true;
      }
      if (expr.includes("main.installed") || expr.includes("plugin.installed")) {
        flags.installedOnly = true;
      }
      if (expr.includes("LOWER(COALESCE(item.fullName, '')) LIKE :keyword") && params?.keyword) {
        flags.keyword = `${params.keyword}`.replace(/%/g, "");
      }
      if (expr.includes("plugin.fullName = :fullName") && params?.fullName) {
        flags.fullName = params.fullName;
      }
      if (expr.includes("plugin.author = :author AND plugin.name = :name") && params?.author && params?.name) {
        flags.author = params.author;
        flags.name = params.name;
      }
      if (expr.includes("plugin.pluginType = :pluginType") && params?.pluginType) {
        flags.pluginType = params.pluginType;
      }
    }

    return builder;
  }

  return {
    state,
    create(record: any) {
      return record;
    },
    async find(options?: any) {
      state.findCalls += 1;
      if (options?.where?.type === "store") {
        if (options.where.installed === true) {
          return state.installedRows;
        }
        return state.existingStoreRows;
      }
      return [];
    },
    async save(records: any[] | any) {
      const list = Array.isArray(records) ? records : [records];
      state.savedRows.push(...list);
      return records;
    },
    async update(where: any, value: any) {
      state.updates.push({ where, value });
    },
    createQueryBuilder() {
      return buildQueryBuilder();
    },
  };
}

describe("PluginService online plugins", () => {
  it("parses online plugin full name", () => {
    assert.deepEqual(parseOnlinePluginFullName("greper/DeployToDemo"), {
      author: "greper",
      name: "DeployToDemo",
    });

    assert.throws(() => parseOnlinePluginFullName("greper/deploy:DeployToDemo"), /插件标识格式错误/);
    assert.throws(() => parseOnlinePluginFullName("DeployToDemo"), /插件标识格式错误/);
  });

  it("detects when an online plugin can upgrade the installed version", () => {
    assert.equal(isOnlinePluginUpgradeAvailable("1.0.0", "1.0.1"), true);
    assert.equal(isOnlinePluginUpgradeAvailable("v1.2.0", "1.2.0"), false);
    assert.equal(isOnlinePluginUpgradeAvailable("2.0.0", "1.9.9"), false);
    assert.equal(isOnlinePluginUpgradeAvailable("beta", "beta2"), true);
  });

  it("allows editing store plugins without developerId or owned by bound user", () => {
    assert.equal(canEditStorePlugin(undefined, undefined), true);
    assert.equal(canEditStorePlugin(0, undefined), true);
    assert.equal(canEditStorePlugin(12, 12), true);
    assert.equal(canEditStorePlugin(12, 13), false);
    assert.equal(canEditStorePlugin(12, undefined), false);
  });

  it("uses fullName for plugin registration and falls back to name when author is empty", () => {
    assert.equal(getPluginFullName({ fullName: "developer/plugin", author: "other", name: "different" }), "developer/plugin");
    assert.equal(getPluginFullName({ author: "developer", name: "plugin" }), "developer/plugin");
    assert.equal(getPluginFullName({ author: "", name: "plugin" }), "plugin");
    assert.equal(getPluginFullName({ name: "developer/plugin", author: "developer" }), "developer/plugin");
  });

  it("requires a user-provided author for local store plugin edits", async () => {
    const service = new PluginService();

    await assert.rejects(() => service.add({ type: "store", author: "local", name: "demo", pluginType: "deploy" }), /请先填写插件作者/);
    await assert.rejects(() => service.update({ id: 1, type: "store", author: "", name: "demo" }), /请先填写插件作者/);
  });

  it("creates a notification plugin with the default template", async () => {
    const service = new PluginService();
    let savedPlugin: any;
    service.repository = {
      async findOne() {
        return null;
      },
      async findOneBy() {
        return null;
      },
      async save(plugin: any) {
        if (plugin.id == null) {
          plugin.id = 1;
        }
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.registerById = async () => {};

    const res = await service.add({
      type: "store",
      author: "greper",
      name: "demo-notify",
      title: "Demo Notify",
      pluginType: "notification",
    });

    assert.equal(savedPlugin.pluginType, "notification");
    assert.match(savedPlugin.content, /BaseNotification/);
    assert.equal(typeof res.id, "number");
  });

  it("marks online plugins with local installation state", async () => {
    const service = new PluginService();
    service.repository = createPluginRepositoryMock({
      marketRows: [
        {
          type: "store",
          fullName: "greper/DeployToDemo",
          author: "greper",
          name: "DeployToDemo",
          pluginType: "deploy",
          latest: "1.0.1",
          title: "Deploy Demo",
        },
        {
          type: "store",
          fullName: "greper/DeployToOther",
          author: "greper",
          name: "DeployToOther",
          pluginType: "deploy",
          latest: "1.0.1",
          title: "Deploy Other",
        },
        {
          type: "store",
          fullName: "other/DeployToDemo",
          author: "other",
          name: "DeployToDemo",
          pluginType: "deploy",
          latest: "1.0.1",
          title: "Deploy Demo From Other Author",
        },
      ],
      installedRows: [
        {
          type: "store",
          id: 3,
          fullName: "greper/DeployToDemo",
          author: "greper",
          name: "DeployToDemo",
          pluginType: "deploy",
          version: "1.0.0",
          disabled: false,
          installed: true,
          content: "name: DeployToDemo",
        },
      ],
    }) as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 3);
    assert.equal(list[0].installed, true);
    assert.equal(list[0].installedVersion, "1.0.0");
    assert.equal(list[0].upgradeAvailable, true);
    assert.equal(list[0].localPluginId, 3);
    assert.equal(list[1].installed, false);
    assert.equal(list[2].installed, false);
    assert.equal((service.repository as any).state.findCalls, 1);
  });

  it("filters market plugins by the current bound developer when onlyMine is enabled", async () => {
    const service = new PluginService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUserId: 12 };
      },
    } as any;
    service.repository = createPluginRepositoryMock({
      marketRows: [
        {
          id: 1,
          type: "store",
          developerId: 12,
          fullName: "developer/owned-plugin",
          author: "developer",
          name: "owned-plugin",
        },
        {
          id: 2,
          type: "store",
          developerId: 20,
          fullName: "other/other-plugin",
          author: "other",
          name: "other-plugin",
        },
      ],
    }) as any;

    const page = await service.page({
      query: {
        type: "store",
        onlyMine: true,
      } as any,
      page: {
        offset: 0,
        limit: 20,
      },
    });

    assert.equal(page.total, 1);
    assert.equal(page.records[0].fullName, "developer/owned-plugin");
  });

  it("does not treat uninstalled market rows as installed plugins", async () => {
    const service = new PluginService();
    service.repository = createPluginRepositoryMock({
      marketRows: [
        {
          type: "store",
          fullName: "developer/new-plugin",
          author: "developer",
          name: "new-plugin",
          pluginType: "access",
          latest: "1.0.0",
        },
      ],
      installedRows: [],
    }) as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, false);
    assert.equal(list[0].upgradeAvailable, false);
  });

  it("syncs online plugin list metadata into pi_plugin and saves the sync time", async () => {
    const service = new PluginService();
    const savedSettings: any[] = [];
    const requestCalls: any[] = [];
    let createdAtLt: number | undefined;
    service.plusService = {
      async register() {},
      async request(config: any) {
        requestCalls.push(config);
        assert.equal(config.url, "/activation/plugin/page");
        assert.equal(config.data.page.limit, 200);
        assert.equal(typeof config.data.createdAtLt, "number");
        if (createdAtLt === undefined) {
          createdAtLt = config.data.createdAtLt;
        } else {
          assert.equal(config.data.createdAtLt, createdAtLt);
        }
        if (config.data.page.start === 0) {
          return {
            page: {
              start: 0,
              limit: 200,
              total: 201,
            },
            list: Array.from({ length: 200 }, (_, index) => ({
              author: "developer",
              name: `plugin-${index + 1}`,
              pluginType: "deploy",
              title: `plugin ${index + 1}`,
              latest: "1.0.0",
              status: "published",
              aiCheckStatus: "passed",
            })),
          };
        }
        assert.equal(config.data.page.start, 200);
        return {
          page: {
            start: 200,
            limit: 200,
            total: 201,
          },
          list: [
            {
              author: "developer",
              name: "plugin-201",
              pluginType: "deploy",
              title: "plugin 201",
              latest: "1.0.0",
              status: "published",
              aiCheckStatus: "passed",
            },
          ],
        };
      },
    } as any;
    service.sysSettingsService = {
      async getSetting() {
        return { lastSyncTime: 0 };
      },
      async saveSetting(setting: any) {
        savedSettings.push(setting);
      },
    } as any;
    const repository = createPluginRepositoryMock({
      existingStoreRows: [
        {
          id: 1,
          type: "store",
          fullName: "developer/old-plugin",
          author: "developer",
          name: "old-plugin",
          pluginType: "deploy",
        },
      ],
      queryRows: [],
    });
    service.repository = repository as any;

    const res = await service.syncOnlinePluginList();

    assert.equal(requestCalls.length, 2);
    assert.equal(res.length, 201);
    assert.equal(repository.state.savedRows.length, 201);
    assert.equal(repository.state.savedRows[0].fullName, "developer/plugin-1");
    assert.equal(repository.state.savedRows[0].aiCheckStatus, "passed");
    assert.equal(savedSettings.length, 1);
    assert.equal(typeof savedSettings[0].lastSyncTime, "number");
    assert.equal(savedSettings[0].lastSyncTime > 0, true);
  });

  it("syncs dependPlugins from platform and returns them in the online list", async () => {
    const service = new PluginService();
    const savedSettings: any[] = [];
    service.plusService = {
      async register() {},
      async request() {
        return {
          page: {
            start: 0,
            limit: 200,
            total: 2,
          },
          list: [
            {
              author: "greper",
              name: "TestDeploy",
              pluginType: "deploy",
              title: "TestDeploy",
              latest: "1.0.2",
              status: "published",
              dependPlugins: {
                "access:greper/hostAccess": "*",
              },
            },
            {
              author: "greper",
              name: "hostAccess",
              pluginType: "access",
              title: "Host Access",
              latest: "1.0.0",
              status: "published",
            },
          ],
        };
      },
    } as any;
    service.sysSettingsService = {
      async getSetting() {
        return { lastSyncTime: 0 };
      },
      async saveSetting(setting: any) {
        savedSettings.push(setting);
      },
    } as any;
    const repository = createPluginRepositoryMock({
      existingStoreRows: [],
      queryRows: [],
    });
    service.repository = repository as any;

    const res = await service.syncOnlinePluginList();

    const saved = repository.state.savedRows.find((item: any) => item.fullName === "greper/TestDeploy");
    assert.deepEqual(yaml.load(saved.dependPlugins), { "access:greper/hostAccess": "*" });
    assert.deepEqual(yaml.load(saved.extra).dependPlugins, { "access:greper/hostAccess": "*" });
    // 列表接口同样能返回 dependPlugins，供前端依赖解析匹配 type:author/name
    const deployRecord = res.find((item: any) => item.fullName === "greper/TestDeploy");
    assert.deepEqual(deployRecord.dependPlugins, { "access:greper/hostAccess": "*" });
    const hostRecord = res.find((item: any) => item.fullName === "greper/hostAccess");
    assert.equal(hostRecord.fullName, "greper/hostAccess");
  });

  it("onlinePluginList returns fullName and dependPlugins for dependency matching", async () => {
    const service = new PluginService();
    const row = {
      id: 1,
      type: "store",
      fullName: "greper/hostAccess",
      author: "greper",
      name: "hostAccess",
      pluginType: "access",
      installed: false,
      dependPlugins: yaml.dump({ "access:aliyun": "*" }),
    };
    service.repository = createPluginRepositoryMock({
      queryRows: [row],
      existingStoreRows: [row],
    }) as any;
    service.sysSettingsService = {
      async getSetting() {
        return {};
      },
    } as any;

    const res = await service.onlinePluginList({});

    // 前端依赖解析依赖这些字段匹配 type:author/name
    assert.equal(res.length, 1);
    assert.equal(res[0].fullName, "greper/hostAccess");
    assert.deepEqual(res[0].dependPlugins, { "access:aliyun": "*" });
  });

  it("page includes synced store plugins without installed state", async () => {
    const service = new PluginService();
    const installedRow = {
      id: 2,
      type: "store",
      fullName: "developer/installed",
      author: "developer",
      name: "installed",
      pluginType: "deploy",
      latest: "1.0.1",
      version: "1.0.0",
      installed: true,
      content: "name: installed",
    };
    service.repository = createPluginRepositoryMock({
      queryRows: [
        {
          id: 1,
          type: "store",
          fullName: "developer/market-only",
          author: "developer",
          name: "market-only",
          pluginType: "deploy",
          latest: "1.0.0",
          content: "",
        },
        installedRow,
        {
          id: 3,
          type: "store",
          name: "custom-one",
          pluginType: "deploy",
          content: "name: custom-one",
        },
      ],
      installedRows: [installedRow],
    }) as any;

    const res = await service.page({
      page: {
        offset: 0,
        limit: 20,
      },
      query: {
        type: "store",
      },
    } as any);

    assert.equal(res.total, 3);
    assert.deepEqual(
      res.records.map((item: any) => item.name),
      ["market-only", "installed", "custom-one"]
    );
    assert.equal((res.records[0] as any).installed, false);
    assert.equal((res.records[1] as any).installed, true);
    assert.equal((res.records[1] as any).localPluginId, installedRow.id);
    assert.equal((res.records[1] as any).upgradeAvailable, true);
  });

  it("registerFromDb skips uninstalled market rows", async () => {
    const service = new PluginService();
    const registered: string[] = [];
    service.repository = createPluginRepositoryMock({
      queryRows: [
        {
          id: 1,
          type: "builtIn",
          name: "builtin-plugin",
        },
        {
          id: 2,
          type: "store",
          fullName: "developer/market-only",
          author: "developer",
          name: "market-only",
          pluginType: "deploy",
          installed: false,
          content: "",
        },
        {
          id: 3,
          type: "store",
          fullName: "developer/installed",
          author: "developer",
          name: "installed",
          pluginType: "deploy",
          installed: true,
          content: "name: installed",
        },
        {
          id: 4,
          type: "store",
          name: "custom-one",
          pluginType: "deploy",
          installed: true,
          content: "name: custom-one",
        },
      ],
    }) as any;
    service.registerPlugin = async plugin => {
      registered.push(plugin.name);
    };

    await service.registerFromDb();

    assert.deepEqual(registered, ["installed", "custom-one"]);
  });

  it("downloads and imports online plugin content as store plugin", async () => {
    const service = new PluginService();
    let importReq: any;
    const downloadUpdates: any[] = [];

    service.plusService = {
      async register() {},
      async request(config: any) {
        assert.equal(config.url, "/activation/plugin/download");
        assert.deepEqual(config.data, { fullName: "greper/DeployToDemo", version: "1.0.1" });
        return {
          fullName: "greper/DeployToDemo",
          content: "name: DeployToDemo\npluginType: deploy\nauthor: local\ncontent: |\n  return class Demo {}\n",
          plugin: {
            fullName: "greper/DeployToDemo",
            author: "greper",
            appId: 3,
            developerId: 12,
            downloadCount: 88,
          },
          version: {
            version: "1.0.1",
          },
        };
      },
    } as any;
    const repository = createPluginRepositoryMock() as any;
    repository.update = async (where: any, value: any) => {
      downloadUpdates.push({ where, value });
      return {};
    };
    service.repository = repository;
    service.importPlugin = async req => {
      importReq = req;
      return { id: 9 };
    };

    const res = await service.installOnlinePlugin({ fullName: "greper/DeployToDemo", version: "1.0.1" });

    assert.equal(res.id, 9);
    assert.equal(res.fullName, "greper/DeployToDemo");
    assert.equal(importReq.override, true);
    assert.equal(importReq.type, "store");
    assert.match(importReq.content, /DeployToDemo/);
    assert.match(importReq.content, /^author: greper$/m);
    assert.match(importReq.content, /^fullName: greper\/DeployToDemo$/m);
    assert.deepEqual(downloadUpdates[0].where, {
      type: "store",
      fullName: "greper/DeployToDemo",
    });
  });

  it("preserves dependPlugins when syncing online plugin metadata", async () => {
    const service = new PluginService();
    service.repository = createPluginRepositoryMock() as any;
    const record = (service as any).normalizeOnlinePluginRecord(
      {
        fullName: "developer/demo",
        author: "developer",
        name: "demo",
        pluginType: "deploy",
        dependPlugins: {
          "access:aliyun": "developer/aliyun-access",
        },
      },
      123
    );

    // extra 是依赖声明的主存储，depend_plugins 列是它的冗余，两者都写入
    assert.deepEqual(yaml.load(record.extra).dependPlugins, {
      "access:aliyun": "developer/aliyun-access",
    });
    assert.deepEqual(yaml.load(record.dependPlugins), {
      "access:aliyun": "developer/aliyun-access",
    });
  });

  it("clears dependPlugins when remote plugin no longer declares dependencies", async () => {
    const service = new PluginService();
    service.repository = createPluginRepositoryMock() as any;
    const old = {
      extra: yaml.dump({ dependPlugins: { "access:aliyun": "developer/aliyun-access" } }),
    };
    const record = (service as any).normalizeOnlinePluginRecord(
      {
        fullName: "developer/demo",
        author: "developer",
        name: "demo",
        pluginType: "deploy",
      },
      123,
      old
    );

    // 远程下掉依赖后，本地旧声明（extra 主存储与列冗余）一并清理
    assert.equal(record.dependPlugins, null);
    assert.deepEqual(yaml.load(record.extra).dependPlugins, {});
  });

  it("reads dependPlugins from the dedicated column", async () => {
    const service = new PluginService();
    const bean = (service as any).toOnlinePluginBean({
      id: 1,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      installed: false,
      dependPlugins: yaml.dump({ "access:aliyun": "*" }),
    });

    assert.deepEqual(bean.dependPlugins, { "access:aliyun": "*" });
  });

  it("parses dependPlugins with author-qualified colon keys from the column", async () => {
    const service = new PluginService();
    // 数据库里存的实际格式：access:author/name: version（含冒号的 key）
    const bean = (service as any).toOnlinePluginBean({
      id: 1,
      type: "store",
      fullName: "tencent/TestDeploy",
      author: "tencent",
      name: "TestDeploy",
      pluginType: "deploy",
      installed: false,
      dependPlugins: "access:tencent/TestAccess: '*'\n",
    });

    assert.deepEqual(bean.dependPlugins, { "access:tencent/TestAccess": "*" });
  });

  it("falls back to extra dependPlugins for legacy records without the column", async () => {
    const service = new PluginService();
    const bean = (service as any).toOnlinePluginBean({
      id: 1,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      installed: false,
      extra: yaml.dump({ dependPlugins: { "access:aliyun": "*" } }),
    });

    assert.deepEqual(bean.dependPlugins, { "access:aliyun": "*" });
  });

  it("writes dependPlugins into the dedicated column when importing plugin content", async () => {
    const service = new PluginService();
    let savedPlugin: any;
    service.repository = {
      async findOne() {
        return null;
      },
      async findOneBy() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.add = async (param: any) => {
      param.id = 1;
      return { id: 1 };
    };
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    await service.importPlugin({
      type: "store",
      override: true,
      content: yaml.dump({
        name: "demo",
        pluginType: "deploy",
        author: "developer",
        dependPlugins: { "access:aliyun": "*" },
        content: "return class Demo {}",
      }),
    });

    // extra 主存储与列冗余都写入
    assert.deepEqual(yaml.load(savedPlugin.dependPlugins), { "access:aliyun": "*" });
    assert.deepEqual(yaml.load(savedPlugin.extra).dependPlugins, { "access:aliyun": "*" });
  });

  it("fills missing yaml version from online plugin version before import", async () => {
    const service = new PluginService();
    let importReq: any;

    service.plusService = {
      async register() {},
      async request() {
        return {
          fullName: "developer/testtest2",
          content: "name: testtest2\npluginType: access\nauthor: developer\ncontent: |\n  return class DemoAccess {}\n",
          plugin: {
            fullName: "developer/testtest2",
          },
          version: {
            version: "1.0.0",
          },
        };
      },
    } as any;
    service.repository = createPluginRepositoryMock() as any;
    service.importPlugin = async req => {
      importReq = req;
      return { id: 10 };
    };

    await service.installOnlinePlugin({ fullName: "developer/testtest2" });

    assert.match(importReq.content, /version: 1\.0\.0/);
  });

  it("preserves synced market ownership when installing plugin content", async () => {
    const service = new PluginService();
    let updatedPlugin: any;

    service.repository = {
      async findOne() {
        return {
          id: 7,
          type: "store",
          appId: 3,
          developerId: 12,
          fullName: "greper/online-plugin",
          latest: "1.0.1",
          status: "published",
          downloadCount: 20,
          syncTime: 123,
        };
      },
    } as any;
    service.update = async plugin => {
      updatedPlugin = plugin;
    };

    await service.importPlugin({
      type: "store",
      override: true,
      content: "name: online-plugin\npluginType: deploy\nauthor: greper\ncontent: |\n  return class Demo {}\n",
    });

    assert.equal(updatedPlugin.id, 7);
    assert.equal(updatedPlugin.appId, 3);
    assert.equal(updatedPlugin.developerId, 12);
    assert.equal(updatedPlugin.latest, "1.0.1");
    assert.equal(updatedPlugin.status, "published");
    assert.equal(updatedPlugin.downloadCount, 20);
    assert.equal(updatedPlugin.syncTime, 123);
    assert.equal(updatedPlugin.installed, true);
  });

  it("reuses a legacy custom plugin when switching an online plugin version", async () => {
    const service = new PluginService();
    const findOptions: any[] = [];
    let updatedPlugin: any;

    (service as any).findOne = async (options: any) => {
      findOptions.push(options);
      if (findOptions.length === 1) {
        return null;
      }
      return {
        id: 7,
        type: "custom",
        author: "greper2",
        name: "BaishanUpdateCert666",
      };
    };
    service.update = async plugin => {
      updatedPlugin = plugin;
    };

    await service.importPlugin({
      type: "store",
      override: true,
      content: "name: BaishanUpdateCert666\npluginType: deploy\nauthor: greper2\ncontent: |\n  return class Demo {}\n",
    });

    assert.equal(findOptions.length, 2);
    assert.deepEqual(findOptions[1].where, {
      author: "greper2",
      name: "BaishanUpdateCert666",
    });
    assert.equal(updatedPlugin.id, 7);
    assert.equal(updatedPlugin.type, "store");
    assert.equal(updatedPlugin.installed, true);
  });

  it("updates a store plugin without conflicting with a legacy custom plugin of the same name", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    (service as any).findOne = async (options: any) => {
      assert.deepEqual(options.where, {
        type: "store",
        fullName: "greper2/BaishanUpdateCert666",
      });
      return {
        id: 7,
        type: "store",
        fullName: "greper2/BaishanUpdateCert666",
      };
    };
    service.unRegisterById = async () => {};
    service.registerById = async () => {};
    service.repository = {
      async save(plugin: any) {
        savedPlugin = plugin;
      },
    } as any;

    await service.update({
      id: 7,
      type: "store",
      fullName: "greper2/BaishanUpdateCert666",
      author: "greper2",
      name: "BaishanUpdateCert666",
    });

    assert.equal(savedPlugin.id, 7);
  });

  it("marks an uninstalled market plugin as installed after importing it again", async () => {
    const service = new PluginService();
    let updatedPlugin: any;

    service.repository = {
      async findOne() {
        return {
          id: 7,
          type: "store",
          developerId: 12,
          fullName: "greper/online-plugin",
          installed: false,
          content: "",
        };
      },
    } as any;
    service.update = async plugin => {
      updatedPlugin = plugin;
    };

    await service.importPlugin({
      type: "store",
      override: true,
      content: "name: online-plugin\npluginType: deploy\nauthor: greper\ncontent: |\n  return class Demo {}\n",
    });

    assert.equal(updatedPlugin.installed, true);
  });

  it("publishes a local store plugin through activation with exported content", async () => {
    const service = new PluginService();
    let requestConfig: any;
    let updatedPlugin: any;
    let registered = false;

    service.sysSettingsService = {
      async getSetting() {
        return { bindUserId: 12 };
      },
    } as any;
    service.plusService = {
      async register() {
        registered = true;
      },
      async request(config: any) {
        requestConfig = config;
        return {
          plugin: {
            appId: 3,
            developerId: 12,
            author: "developer",
            fullName: "developer/custom-one",
            latest: "1.2.3",
            status: "reviewing",
          },
          version: { version: "1.2.3" },
        };
      },
    } as any;
    service.getOnlinePluginAuthor = async () => {
      return {
        registered: true,
        author: {
          id: 2,
          name: "developer",
        },
      };
    };
    service.info = async () => {
      return {
        id: 7,
        type: "store",
        name: "custom-one",
        version: "1.2.3",
      } as any;
    };
    service.exportPlugin = async () => {
      return "name: custom-one\nversion: 1.2.3\n";
    };
    service.update = async plugin => {
      updatedPlugin = plugin;
    };

    const res = await service.publishLocalPlugin({ id: 7 });

    assert.equal(registered, true);
    assert.equal(res.plugin.fullName, "developer/custom-one");
    assert.equal(requestConfig.url, "/activation/plugin/publish");
    assert.equal(requestConfig.method, "post");
    assert.match(requestConfig.data.content, /^author: developer$/m);
    assert.match(requestConfig.data.content, /^fullName: developer\/custom-one$/m);
    assert.equal(requestConfig.data.version, "1.2.3");
    assert.equal(requestConfig.data.minAppVersion, "");
    assert.equal(requestConfig.data.maxAppVersion, "");
    assert.equal(updatedPlugin.appId, 3);
    assert.equal(updatedPlugin.developerId, 12);
    assert.equal(updatedPlugin.author, "developer");
    assert.equal(updatedPlugin.fullName, "developer/custom-one");
  });

  it("gets and creates online plugin author for the bound user", async () => {
    const service = new PluginService();
    const requestConfigs: any[] = [];

    service.sysSettingsService = {
      async getSetting() {
        return { bindUserId: 23 };
      },
    } as any;
    service.plusService = {
      async register() {},
      async request(config: any) {
        requestConfigs.push(config);
        if (config.url === "/activation/plugin/author/get") {
          return {
            registered: false,
          };
        }
        return {
          id: 5,
          name: "developer",
        };
      },
    } as any;

    const authorGet = await service.getOnlinePluginAuthor();
    const authorAdd = await service.addOnlinePluginAuthor({
      name: "developer",
      displayName: "Developer",
    });

    assert.equal(authorGet.registered, false);
    assert.equal(authorAdd.name, "developer");
    assert.deepEqual(requestConfigs[0], {
      url: "/activation/plugin/author/get",
      method: "post",
      data: {},
    });
    assert.deepEqual(requestConfigs[1], {
      url: "/activation/plugin/author/add",
      method: "post",
      data: {
        name: "developer",
        displayName: "Developer",
        avatar: "",
        desc: "",
      },
    });
  });

  it("gets local plugin publish management info with author and market versions", async () => {
    const service = new PluginService();
    service.sysSettingsService = {
      async getSetting() {
        return { bindUserId: 12 };
      },
    } as any;
    service.info = async () => {
      return {
        id: 7,
        type: "store",
        name: "custom-one",
        title: "Custom One",
        pluginType: "deploy",
        group: "cdn",
        version: "1.0.0",
      } as any;
    };
    service.getOnlinePluginAuthor = async () => {
      return {
        registered: true,
        author: {
          id: 2,
          name: "developer",
        },
      };
    };
    service.onlinePluginDetail = async req => {
      assert.equal(req.fullName, "developer/custom-one");
      return {
        plugin: {
          fullName: "developer/custom-one",
          status: "reviewing",
        },
        versions: [
          {
            version: "1.0.0",
            status: "reviewing",
            reviewStatus: "ai_pending",
          },
        ],
      };
    };

    const info = await service.getOnlinePluginPublishInfo({ id: 7 });

    assert.equal(info.localPlugin.name, "custom-one");
    assert.equal(info.authorRegistered, true);
    assert.equal(info.marketPlugin?.fullName, "developer/custom-one");
    assert.equal(info.versions[0].reviewStatus, "ai_pending");
  });

  it("deletes plugins regardless of their market synchronization state", async () => {
    const service = new PluginService();
    const updates: any[] = [];
    const deleted: number[] = [];
    const unregistered: number[] = [];

    service.repository = {
      async update(where: any, values: any) {
        updates.push({ where, values });
      },
    } as any;
    service.info = async (id: number) => {
      if (id === 7) {
        return {
          id,
          type: "store",
          developerId: 12,
          fullName: "developer/online-plugin",
          installed: true,
          content: "name: online-plugin",
          metadata: "input: {}",
          extra: "dependPackages: {}",
          version: "1.0.0",
          disabled: true,
        } as any;
      }
      return {
        id,
        type: "store",
        fullName: "local/local-plugin",
        content: "name: local-plugin",
      } as any;
    };
    service.unRegisterById = async id => {
      unregistered.push(id);
    };
    service.delete = (async (id: any) => {
      deleted.push(Number(id));
    }) as any;

    await service.deleteByIds([7, 8]);

    assert.deepEqual(unregistered, [7, 8]);
    assert.deepEqual(deleted, [7, 8]);
    assert.deepEqual(updates, []);
  });

  it("uninstalls a synced online plugin without deleting market metadata", async () => {
    const service = new PluginService();
    const updates: any[] = [];
    const deleted: number[] = [];
    const unregistered: number[] = [];

    service.repository = {
      async update(where: any, values: any) {
        updates.push({ where, values });
      },
    } as any;
    service.info = async (id: number) => {
      return {
        id,
        type: "store",
        developerId: 12,
        installed: true,
      } as any;
    };
    service.unRegisterById = async id => {
      unregistered.push(id);
    };
    service.delete = (async (id: any) => {
      deleted.push(Number(id));
    }) as any;

    await service.uninstallOnlinePlugin(7);

    assert.deepEqual(unregistered, [7]);
    assert.deepEqual(deleted, []);
    assert.deepEqual(updates, [
      {
        where: { id: 7 },
        values: {
          installed: false,
          disabled: false,
        },
      },
    ]);
  });

  it("does not uninstall a local plugin through the online uninstall operation", async () => {
    const service = new PluginService();
    const deleted: number[] = [];

    service.info = async (id: number) => {
      return {
        id,
        type: "store",
        installed: false,
      } as any;
    };
    service.delete = (async (id: any) => {
      deleted.push(Number(id));
    }) as any;

    await assert.rejects(service.uninstallOnlinePlugin(7), /在线插件/);

    assert.deepEqual(deleted, []);
  });

  it("persists dependPlugins from the edit form (object form) through update", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    service.repository = {
      async findOne() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    // 前端编辑表单提交的是 KvInput 的对象形式
    await service.update({
      id: 7,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      dependPlugins: {
        "access:aliyun": "*",
      },
    });

    assert.deepEqual(yaml.load(savedPlugin.dependPlugins), { "access:aliyun": "*" });
  });

  it("persists dependPlugins from the edit form (yaml string form) through update", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    service.repository = {
      async findOne() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    // 部分提交路径（如表格 Fast Crud submit）可能已经是 YAML 字符串
    await service.update({
      id: 7,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      dependPlugins: yaml.dump({ "access:aliyun": "*" }),
    });

    assert.deepEqual(yaml.load(savedPlugin.dependPlugins), { "access:aliyun": "*" });
  });

  it("redundantly writes dependPlugins into the column from extra (yaml string form)", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    service.repository = {
      async findOne() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    // 前端仍以 extra.dependPlugins 提交（旧方式），extra 是 YAML 字符串
    await service.update({
      id: 7,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      extra: yaml.dump({ dependPlugins: { "access:aliyun": "*" } }),
    });

    assert.deepEqual(yaml.load(savedPlugin.dependPlugins), { "access:aliyun": "*" });
  });

  it("redundantly writes dependPlugins into the column from extra (object form)", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    service.repository = {
      async findOne() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    // 兼容 extra 直接以对象形式提交的路径
    await service.update({
      id: 7,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      extra: {
        dependPlugins: { "access:aliyun": "*" },
      },
    });

    assert.deepEqual(yaml.load(savedPlugin.dependPlugins), { "access:aliyun": "*" });
  });

  it("clears the column when extra has no dependPlugins declaration", async () => {
    const service = new PluginService();
    let savedPlugin: any;

    service.repository = {
      async findOne() {
        return null;
      },
      async save(plugin: any) {
        savedPlugin = plugin;
        return plugin;
      },
    } as any;
    service.unRegisterById = async () => {};
    service.registerById = async () => {};

    await service.update({
      id: 7,
      type: "store",
      fullName: "developer/demo",
      author: "developer",
      name: "demo",
      pluginType: "deploy",
      extra: yaml.dump({ dependPackages: {} }),
    });

    assert.equal(savedPlugin.dependPlugins, null);
  });

  it("exports dependPlugins back into the plugin YAML", async () => {
    const service = new PluginService();
    service.info = (async (id: number) => {
      return {
        id,
        type: "store",
        fullName: "developer/demo",
        author: "developer",
        name: "demo",
        pluginType: "deploy",
        title: "demo",
        icon: "icon",
        group: "default",
        desc: "desc",
        version: "1.0.0",
        dependPlugins: yaml.dump({ "access:aliyun": "*" }),
      } as any;
    }) as any;

    const content = await service.exportPlugin(7);
    const loaded = yaml.load(content) as Record<string, any>;

    assert.deepEqual(loaded.dependPlugins, { "access:aliyun": "*" });
  });
});
