import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function generateUrls(bucket: string, key: string) {
  const client = new S3Client({
    s3ForcePathStyle: true,
    signatureVersion: "v4",
    region: "us-east-1",
    forcePathStyle: true,
    endpoint: "https://play.min.io",
    credentials: {
      accessKeyId: "Q3AM3UQ867SPQQA43P2F", //访问登录名
      secretAccessKey: "zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG" //访问密码
    }
  });
  const getParams = {
    Bucket: bucket,
    Key: key
  };
  let url;
  const getCmd = new GetObjectCommand(getParams);
  try {
    url = await getSignedUrl(client, getCmd);
  } catch (err) {
    console.log("Error getting signed URL ", err);
  }

  return url;
}
