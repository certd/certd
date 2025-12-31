import { Bootstrap } from '@midwayjs/bootstrap';
await Bootstrap.configure({
  	ignore: ["**/plugins/**","/plugins/","plugins","dist/plugins","/dist/plugins","dist\\plugins"]
  }).run();
