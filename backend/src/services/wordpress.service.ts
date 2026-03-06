import axios from "axios";
import { env } from "../config/env.js";

type WpPostPayload = {
  title: string;
  content: string;
  status?: "draft" | "publish";
  categories?: number[];
  tags?: number[];
  featured_media?: number;
};

function wpClient() {
  if (!env.wordpressBaseUrl || !env.wordpressUsername || !env.wordpressAppPassword) {
    throw new Error("WordPress credentials are not configured");
  }

  const auth = Buffer.from(`${env.wordpressUsername}:${env.wordpressAppPassword}`).toString("base64");

  return axios.create({
    baseURL: `${env.wordpressBaseUrl}/wp-json/wp/v2`,
    headers: {
      Authorization: `Basic ${auth}`
    }
  });
}

export async function createPost(payload: WpPostPayload): Promise<{ id: number; link: string }> {
  const client = wpClient();
  const { data } = await client.post("/posts", payload);
  return { id: data.id, link: data.link };
}

export async function updatePost(postId: number, payload: WpPostPayload): Promise<{ id: number; link: string }> {
  const client = wpClient();
  const { data } = await client.post(`/posts/${postId}`, payload);
  return { id: data.id, link: data.link };
}

export async function uploadImage(imageUrl: string, filename: string): Promise<number> {
  const response = await axios.get<ArrayBuffer>(imageUrl, { responseType: "arraybuffer" });
  const client = wpClient();

  const { data } = await client.post("/media", response.data, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename=${filename}`
    }
  });

  return data.id;
}
