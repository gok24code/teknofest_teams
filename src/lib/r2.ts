import "server-only";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Eksik ortam değişkeni: ${name}`);
  return value;
}

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

const bucket = () => requireEnv("R2_BUCKET_NAME");

export class PreconditionFailedError extends Error {}

/** JSON nesnesini okur. Nesne yoksa `null` döner. */
export async function getJSON<T>(key: string): Promise<{ data: T; etag: string } | null> {
  try {
    const res = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    const body = await res.Body!.transformToString("utf-8");
    return { data: JSON.parse(body) as T, etag: res.ETag ?? "" };
  } catch (err) {
    if (err instanceof S3ServiceException && err.name === "NoSuchKey") return null;
    throw err;
  }
}

/**
 * JSON nesnesini yazar. `etag` verilirse yalnızca nesne değişmemişse yazar,
 * `etag === null` ise yalnızca nesne henüz yoksa yazar (iyimser kilitleme).
 */
export async function putJSON(key: string, data: unknown, etag?: string | null): Promise<void> {
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: JSON.stringify(data),
        ContentType: "application/json; charset=utf-8",
        ...(etag ? { IfMatch: etag } : {}),
        ...(etag === null ? { IfNoneMatch: "*" } : {}),
      }),
    );
  } catch (err) {
    if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 412) {
      throw new PreconditionFailedError("Veri eşzamanlı olarak değiştirildi.");
    }
    throw err;
  }
}
