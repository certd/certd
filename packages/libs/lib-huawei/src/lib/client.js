import { Signer, SigHttpRequest } from "./signer.js";
import axios from "axios";
export class HuaweiYunClient {
  access;
  constructor(access, logger) {
    this.access = access;
  }
  async request(options) {
    const sig = new Signer(this.access.accessKeyId, this.access.accessKeySecret);
    //The following example shows how to set the request URL and parameters to query a VPC list.
    //Specify a request method, such as GET, PUT, POST, DELETE, HEAD, and PATCH.
    //Set request host.
    //Set request URI.
    //Set parameters for the request URL.
    let body = undefined;
    if (options.data) {
      body = JSON.stringify(options.data);
    }
    const r = new SigHttpRequest(options.method, options.url, options.headers, body);
    //Add header parameters, for example, x-domain-id for invoking a global service and x-project-id for invoking a project-level service.
    r.headers = { "Content-Type": "application/json" };
    //Add a body if you have specified the PUT or POST method. Special characters, such as the double quotation mark ("), contained in the body must be escaped.
    // r.body = option;
    const opt = sig.Sign(r);
    try {
      const res = await axios.request({
        url: options.url,
        method: options.method,
        headers: opt.headers,
        data: body,
      });
      return res.data;
    } catch (e) {
      this.logger.error("华为云接口请求出错：", e?.response?.data);
      const error = new Error(e?.response?.data.message);
      error.code = e?.response?.code;
      throw error;
    }
  }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3BsdWdpbnMvcGx1Z2luLWh1YXdlaS9saWIvY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRXJELE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMxQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFRekMsTUFBTSxPQUFPLGVBQWU7SUFDMUIsTUFBTSxDQUFlO0lBQ3JCLFlBQVksTUFBb0I7UUFDOUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUNELEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBMEI7UUFDdEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxNQUFNLENBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUN2QixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FDNUIsQ0FBQztRQUVGLDRGQUE0RjtRQUM1Riw0RUFBNEU7UUFDNUUsbUJBQW1CO1FBQ25CLGtCQUFrQjtRQUNsQixxQ0FBcUM7UUFDckMsSUFBSSxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBQ3JCLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNoQixJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDckM7UUFDRCxNQUFNLENBQUMsR0FBRyxJQUFJLGNBQWMsQ0FDMUIsT0FBTyxDQUFDLE1BQU0sRUFDZCxPQUFPLENBQUMsR0FBRyxFQUNYLE9BQU8sQ0FBQyxPQUFPLEVBQ2YsSUFBSSxDQUNMLENBQUM7UUFDRixzSUFBc0k7UUFDdEksQ0FBQyxDQUFDLE9BQU8sR0FBRyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxDQUFDO1FBQ25ELDRKQUE0SjtRQUM1SixtQkFBbUI7UUFDbkIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QixJQUFJO1lBQ0YsTUFBTSxHQUFHLEdBQUcsTUFBTSxLQUFLLENBQUMsT0FBTyxDQUFDO2dCQUM5QixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ2hCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPO2dCQUNwQixJQUFJLEVBQUUsSUFBSTthQUNYLENBQUMsQ0FBQztZQUNILE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztTQUNqQjtRQUFDLE9BQU8sQ0FBTSxFQUFFO1lBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QyxNQUFNLEtBQUssR0FBUSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4RCxLQUFLLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQy9CLE1BQU0sS0FBSyxDQUFDO1NBQ2I7SUFDSCxDQUFDO0NBQ0YifQ==
