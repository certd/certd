// import { random } from "lodash-es";
// import { locker } from "./dist/utils/util.lock.js";

// async function testLocker() {
//   for (let i = 0; i < 10; i++) {
//     await locker.execute("test", async () => {
//       console.log("test", i);
//       await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
//       throw new Error("test error");
//     });
//   }
// }

// await testLocker();

// import { domainUtils } from "./dist/utils/util.domain.js";

// console.log(domainUtils.isIpv6("::0:0:0:FFFF:129.144.52.38"));

// import { http } from "./dist/utils/util.request.js";

// http
//   .request({
//     url: "https://www.baidu.com/234234/3333",
//     retry: {
//       status: [404],
//     },
//   })
//   .then(res => {
//     console.log(res.data);
//   });
