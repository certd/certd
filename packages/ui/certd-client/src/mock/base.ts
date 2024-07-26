import _ from "lodash-es";
function copyList(originList: any, newList: any, options: any, parentId?: any) {
  for (const item of originList) {
    const newItem: any = _.cloneDeep(item);
    if (parentId != null && newItem.parentId == null) {
      newItem.parentId = parentId;
    }

    newItem.id = ++options.idGenerator;
    newList.push(newItem);
    if (item.children != null) {
      newItem.children = [];
      copyList(item.children, newItem.children, options, newItem.id);
    }
  }
}

function delById(req: any, list: any) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    console.log("remove i", i, req, req.params.id, item.id);
    if (item.id === parseInt(req.params.id)) {
      console.log("remove i", i);
      list.splice(i, 1);
      break;
    }
    if (item.children != null && item.children.length > 0) {
      delById(req, item.children);
    }
  }
}

function findById(id: any, list: any) {
  for (const item of list) {
    if (item.id === id) {
      return item;
    }
    if (item.children != null && item.children.length > 0) {
      const sub: any = findById(id, item.children);
      if (sub != null) {
        return sub;
      }
    }
  }
}
function findByIds(ids: any[], list: any) {
  const res = [];
  for (const id of ids) {
    const item = findById(id, list);
    if (item != null) {
      res.push(item);
    }
  }
  console.log("findbyids", res, ids);
  return res;
}
const mockUtil: any = {
  findById,
  buildMock(options: any) {
    const name = options.name;
    if (options.copyTimes == null) {
      options.copyTimes = 29;
    }
    const list: any = [];
    for (let i = 0; i < options.copyTimes; i++) {
      copyList(options.list, list, options);
    }
    options.list = list;
    return [
      {
        path: "/mock/" + name + "/page",
        method: "get",
        handle(req: any) {
          let data = [...list];
          let limit = 20;
          let offset = 0;
          for (const item of list) {
            if (item.children != null && item.children.length === 0) {
              item.hasChildren = false;
              item.lazy = false;
            }
          }
          let orderProp: any, orderAsc: any;
          if (req && req.body) {
            const { page, sort } = req.body;
            let query = req.body.query;
            if (page.limit != null) {
              limit = parseInt(page.limit);
            }
            if (page.offset != null) {
              offset = parseInt(page.offset);
            }
            orderProp = sort.prop;
            orderAsc = sort.asc;
            query = query || {};
            if (Object.keys(query).length > 0) {
              data = list.filter((item: any) => {
                let allFound = true; // 是否所有条件都符合
                for (const key in query) {
                  // 判定某一个条件
                  const value = query[key];
                  if (value == null || value === "") {
                    continue;
                  }
                  if (value instanceof Array) {
                    // 如果条件中的value是数组的话，只要查到一个就行
                    if (value.length === 0) {
                      continue;
                    }
                    let found = false;
                    for (const i of value) {
                      if (item[key] instanceof Array) {
                        for (const j of item[key]) {
                          if (i === j) {
                            found = true;
                            break;
                          }
                        }
                        if (found) {
                          break;
                        }
                      } else if (item[key] === i || (typeof item[key] === "string" && item[key].indexOf(i + "") >= 0)) {
                        found = true;
                        break;
                      }
                      if (found) {
                        break;
                      }
                    }
                    if (!found) {
                      allFound = false;
                    }
                  } else if (value instanceof Object) {
                    for (const key2 in value) {
                      const v = value[key2];
                      if (v && item[key] && v !== item[key][key2]) {
                        return false;
                      }
                    }
                  } else if (item[key] !== value) {
                    allFound = false;
                  }
                }
                return allFound;
              });
            }
          }

          const start = offset;
          let end = offset + limit;
          if (data.length < end) {
            end = data.length;
          }

          if (orderProp) {
            // 排序
            data.sort((a, b) => {
              let ret = 0;
              if (a[orderProp] > b[orderProp]) {
                ret = 1;
              } else {
                ret = -1;
              }
              return orderAsc ? ret : -ret;
            });
          }

          const records = data.slice(start, end);
          const lastOffset = data.length - (data.length % limit);
          if (offset > lastOffset) {
            offset = lastOffset;
          }
          return {
            code: 0,
            msg: "success",
            data: {
              records: records,
              total: data.length,
              limit,
              offset
            }
          };
        }
      },
      {
        path: "/mock/" + name + "/get",
        method: "get",
        handle(req: any) {
          let id = req.params.id;
          id = parseInt(id);
          const current = findById(req.body.id, list);
          return {
            code: 0,
            msg: "success",
            data: current
          };
        }
      },
      {
        path: "/mock/" + name + "/byIds",
        method: "post",
        handle(req: any) {
          const ids = req.body.ids;
          const res = findByIds(ids, list);
          return {
            code: 0,
            msg: "success",
            data: res
          };
        }
      },
      {
        path: "/mock/" + name + "/add",
        method: "post",
        handle(req: any) {
          req.body.id = ++options.idGenerator;
          list.unshift(req.body);
          return {
            code: 0,
            msg: "success",
            data: _.cloneDeep(req.body)
          };
        }
      },
      {
        path: "/mock/" + name + "/update",
        method: "post",
        handle(req: any): any {
          const item = findById(req.body.id, list);
          if (item) {
            _.mergeWith(item, req.body, (objValue: any, srcValue: any) => {
              if (srcValue == null) {
                return;
              }
              // 如果被合并对象为数组，则直接被覆盖对象覆盖，只要覆盖对象不为空
              if (_.isArray(objValue)) {
                return srcValue;
              }
            });
          }
          return {
            code: 0,
            msg: "success",
            data: null
          };
        }
      },
      {
        path: "/mock/" + name + "/delete",
        method: "post",
        handle(req: any): any {
          delById(req, list);
          return {
            code: 0,
            msg: "success",
            data: null
          };
        }
      },
      {
        path: "/mock/" + name + "/batchDelete",
        method: "post",
        handle(req: any): any {
          const ids = req.body.ids;
          for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            if (ids.indexOf(item.id) >= 0) {
              list.splice(i, 1);
            }
          }
          return {
            code: 0,
            msg: "success",
            data: null
          };
        }
      },
      {
        path: "/mock/" + name + "/delete",
        method: "post",
        handle(req: any): any {
          delById(req, list);
          return {
            code: 0,
            msg: "success",
            data: null
          };
        }
      },
      {
        path: "/mock/" + name + "/all",
        method: "post",
        handle(req: any): any {
          return {
            code: 0,
            msg: "success",
            data: list
          };
        }
      },
      {
        path: "/mock/" + name + "/cellUpdate",
        method: "post",
        handle(req: any): any {
          console.log("req", req);
          let item = findById(req.body.id, list);
          if (item) {
            _.mergeWith(item, { [req.body.key]: req.body.value }, (objValue: any, srcValue: any) => {
              if (srcValue == null) {
                return;
              }
              // 如果被合并对象为数组，则直接被覆盖对象覆盖，只要覆盖对象不为空
              if (_.isArray(objValue)) {
                return srcValue;
              }
            });
          } else {
            item = {
              id: ++options.idGenerator,
              [req.body.key]: req.body.value
            };
            list.unshift(item);
          }

          return {
            code: 0,
            msg: "success",
            data: item
          };
        }
      },
      {
        path: "/mock/" + name + "/columnUpdate",
        method: "post",
        handle(req: any): any {
          for (const item of req.body) {
            const item2 = findById(item.id, list);
            if (item2) {
              _.mergeWith(item2, item, (objValue: any, srcValue: any) => {
                if (srcValue == null) {
                  return;
                }
                // 如果被合并对象为数组，则直接被覆盖对象覆盖，只要覆盖对象不为空
                if (_.isArray(objValue)) {
                  return srcValue;
                }
              });
            }
          }
          return {
            code: 0,
            msg: "success",
            data: null
          };
        }
      }
    ];
  }
};

export default mockUtil;
