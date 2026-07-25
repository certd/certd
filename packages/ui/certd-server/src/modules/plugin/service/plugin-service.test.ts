import assert from "node:assert/strict";

import { PluginService, parseOnlinePluginFullName, isOnlinePluginUpgradeAvailable } from "./plugin-service.js";

function createMarketRepositoryMock(list: any[]) {
  return {
    createQueryBuilder() {
      return {
        andWhere() {
          return this;
        },
        orderBy() {
          return this;
        },
        addOrderBy() {
          return this;
        },
        getMany() {
          return list;
        },
      };
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

  it("marks online plugins with local installation state", async () => {
    const service = new PluginService();
    service.pluginMarketItemRepository = createMarketRepositoryMock([
      {
        fullName: "greper/DeployToDemo",
        author: "greper",
        name: "DeployToDemo",
        latest: "1.0.1",
        syncTime: 1784566000000,
      },
    ]) as any;
    service.repository = {
      async findOne() {
        return {
          id: 3,
          version: "1.0.0",
          disabled: false,
        };
      },
    } as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, true);
    assert.equal(list[0].installedVersion, "1.0.0");
    assert.equal(list[0].upgradeAvailable, true);
    assert.equal(list[0].localPluginId, 3);
  });

  it("matches installed online dnsProvider plugins saved with full name", async () => {
    const service = new PluginService();
    service.pluginMarketItemRepository = createMarketRepositoryMock([
      {
        fullName: "developer/testtest3",
        author: "developer",
        name: "testtest3",
        pluginType: "dnsProvider",
        latest: "1.0.0",
      },
    ]) as any;
    service.repository = {
      async findOne(options: any) {
        const where = options.where;
        if (Array.isArray(where) && where.some(item => item.name === "developer/testtest3")) {
          return {
            id: 4,
            version: "1.0.0",
            disabled: false,
          };
        }
        return null;
      },
    } as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, true);
    assert.equal(list[0].upgradeAvailable, false);
    assert.equal(list[0].localPluginId, 4);
  });

  it("matches legacy installed dnsProvider plugins saved without author", async () => {
    const service = new PluginService();
    service.pluginMarketItemRepository = createMarketRepositoryMock([
      {
        fullName: "developer/testtest3",
        author: "developer",
        name: "testtest3",
        pluginType: "dnsProvider",
        latest: "1.0.0",
      },
    ]) as any;
    service.repository = {
      async findOne(options: any) {
        const where = options.where;
        if (Array.isArray(where) && where.some(item => item.name === "testtest3" && item.pluginType === "dnsProvider")) {
          return {
            id: 5,
            version: "1.0.0",
            disabled: false,
          };
        }
        return null;
      },
    } as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, true);
    assert.equal(list[0].upgradeAvailable, false);
    assert.equal(list[0].localPluginId, 5);
  });

  it("does not mark uninstalled online plugins as upgradeable", async () => {
    const service = new PluginService();
    service.pluginMarketItemRepository = createMarketRepositoryMock([
      {
        fullName: "developer/new-plugin",
        author: "developer",
        name: "new-plugin",
        latest: "1.0.0",
      },
    ]) as any;
    service.repository = {
      async findOne() {
        return null;
      },
    } as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, false);
    assert.equal(list[0].upgradeAvailable, false);
  });

  it("does not mark installed online plugins without local version as upgradeable", async () => {
    const service = new PluginService();
    service.pluginMarketItemRepository = createMarketRepositoryMock([
      {
        fullName: "developer/testtest2",
        author: "developer",
        name: "testtest2",
        pluginType: "access",
        latest: "1.0.0",
      },
    ]) as any;
    service.repository = {
      async findOne() {
        return {
          id: 8,
          version: null,
          disabled: false,
        };
      },
    } as any;

    const list = await service.onlinePluginList({});

    assert.equal(list.length, 1);
    assert.equal(list[0].installed, true);
    assert.equal(list[0].installedVersion, null);
    assert.equal(list[0].upgradeAvailable, false);
  });

  it("syncs online plugin list metadata to local market table without yaml content", async () => {
    const service = new PluginService();
    const savedRecords: any[] = [];
    const existingRecords: any[] = [
      {
        id: 1,
        fullName: "developer/old-plugin",
        author: "developer",
        name: "old-plugin",
        pluginType: "deploy",
      },
    ];
    const requestCalls: any[] = [];
    const buildItem = (index: number) => {
      return {
        fullName: `developer/plugin-${index}`,
        author: "developer",
        name: `plugin-${index}`,
        pluginType: index % 2 === 0 ? "deploy" : "access",
        title: `plugin ${index}`,
        latest: "1.0.0",
        status: "published",
      };
    };

    service.plusService = {
      async register() {},
      async request(config: any) {
        requestCalls.push(config);
        assert.equal(config.url, "/activation/plugin/list");
        assert.equal(config.data.pluginType, undefined);
        assert.equal(config.data.page.limit, 200);
        if (config.data.page.start === 0) {
          return {
            list: Array.from({ length: 200 }, (_, index) => {
              return buildItem(index + 1);
            }),
          };
        }
        if (config.data.page.start === 200) {
          return {
            list: [buildItem(201)],
          };
        }
        return {
          list: [],
        };
      },
    } as any;
    service.pluginMarketItemRepository = {
      async find() {
        return existingRecords;
      },
      create(record: any) {
        return record;
      },
      async save(records: any[]) {
        savedRecords.push(...records);
        return records;
      },
      createQueryBuilder() {
        return {
          andWhere() {
            return this;
          },
          orderBy() {
            return this;
          },
          addOrderBy() {
            return this;
          },
          getMany() {
            return savedRecords;
          },
        };
      },
    } as any;
    service.repository = {
      async findOne() {
        return null;
      },
    } as any;

    const res = await service.syncOnlinePluginList();

    assert.equal(requestCalls.length, 2);
    assert.deepEqual(
      requestCalls.map(item => item.data.page.start),
      [0, 200]
    );
    assert.equal(res.length, 201);
    assert.equal(savedRecords.length, 201);
    assert.equal(
      savedRecords.some(record => record.content),
      false
    );
    assert.equal(savedRecords[0].fullName, "developer/plugin-1");
    assert.equal(savedRecords[200].fullName, "developer/plugin-201");
  });

  it("downloads and imports online plugin content as store plugin", async () => {
    const service = new PluginService();
    let importReq: any;

    service.plusService = {
      async register() {},
      async request(config: any) {
        assert.equal(config.url, "/activation/plugin/download");
        assert.deepEqual(config.data, { fullName: "greper/DeployToDemo", version: "1.0.1" });
        return {
          fullName: "greper/DeployToDemo",
          content: "name: DeployToDemo\npluginType: deploy\nauthor: greper\ncontent: |\n  return class Demo {}\n",
          plugin: {
            fullName: "greper/DeployToDemo",
          },
          version: {
            version: "1.0.1",
          },
        };
      },
    } as any;
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
    service.importPlugin = async req => {
      importReq = req;
      return { id: 10 };
    };

    await service.installOnlinePlugin({ fullName: "developer/testtest2" });

    assert.match(importReq.content, /version: 1\.0\.0/);
  });
});
