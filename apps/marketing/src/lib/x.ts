import { Client, OAuth1 } from "@xdevplatform/xdk";

function readOptionalEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function getRequiredEnv(name: string) {
  const value = readOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is required for X publishing`);
  }
  return value;
}

function hasOAuth1Credentials() {
  return Boolean(
    readOptionalEnv("X_API_KEY") &&
      readOptionalEnv("X_API_SECRET") &&
      readOptionalEnv("X_ACCESS_TOKEN") &&
      readOptionalEnv("X_ACCESS_TOKEN_SECRET"),
  );
}

export function isXPublishingConfigured() {
  return hasOAuth1Credentials() || Boolean(readOptionalEnv("X_OAUTH2_ACCESS_TOKEN"));
}

function createXClient() {
  if (hasOAuth1Credentials()) {
    const oauth1 = new OAuth1({
      apiKey: getRequiredEnv("X_API_KEY"),
      apiSecret: getRequiredEnv("X_API_SECRET"),
      callback: "oob",
      accessToken: getRequiredEnv("X_ACCESS_TOKEN"),
      accessTokenSecret: getRequiredEnv("X_ACCESS_TOKEN_SECRET"),
    });

    return new Client({ oauth1 });
  }

  const accessToken = readOptionalEnv("X_OAUTH2_ACCESS_TOKEN");
  if (accessToken) {
    return new Client({ accessToken });
  }

  throw new Error(
    "X publishing is not configured. Add OAuth 1.0a credentials or an OAuth 2.0 user token.",
  );
}

export type XPublishedPost = {
  id: string;
  text: string;
  url: string;
};

export async function publishTextPostToX(text: string): Promise<XPublishedPost> {
  const client = createXClient();
  const response = await client.posts.create({ text });
  const postId = response.data?.id;

  if (!postId) {
    throw new Error("The X API did not return a post id.");
  }

  return {
    id: postId,
    text: response.data?.text ?? text,
    url: `https://x.com/i/web/status/${postId}`,
  };
}
