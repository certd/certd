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

import { domainUtils } from "./dist/utils/util.domain.js";

console.log(domainUtils.isIpv6("::0:0:0:FFFF:129.144.52.38"));
