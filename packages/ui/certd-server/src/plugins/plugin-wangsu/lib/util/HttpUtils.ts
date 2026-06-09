import { HttpRequestMsg } from "../model/HttpRequestMsg.js"; // Assuming you have a TypeScript version of this
import { ApiAuthException } from "../exception/ApiAuthException.js"; // Assuming you have a TypeScript version of this
import axios, { AxiosError } from "axios";

export class HttpUtils {
  private constructor() {}
  public static async call(requestMsg: HttpRequestMsg): Promise<string | null> {
    let response;
    try {
      response = await axios({
        method: requestMsg.method,
        url: requestMsg.url,
        headers: requestMsg.headers,
        data: requestMsg.body,
      });
      console.info("API invoke success. Response:", response.data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        // Handle AxiosError specifically
        console.error("API invoke failed. Response:", error.response.data);
        return error.response.data;
      } else {
        // Handle other types of errors
        console.error("API invoke failed.", error);
      }
      throw new ApiAuthException("API invoke failed.");
    }
  }
}
