import type { Metadata } from "next";

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_API_URL || "https://whitesmoke-lapwing-348992.hostingersite.com";
  const url = input.path ? `${siteUrl}${input.path}` : siteUrl;

  return {
    title: input.title,
    description: input.description,
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description
    }
  };
}
