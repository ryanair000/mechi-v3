import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { toContentItem } from "@/lib/content-items";
import { createServiceClient } from "@/lib/supabase";
import { buildXPostText } from "@/lib/x-post";
import { isXPublishingConfigured, publishTextPostToX } from "@/lib/x";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatPublishError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "X publish failed";
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);
  if (auth.error) return auth.error;

  if (!isXPublishingConfigured()) {
    return NextResponse.json(
      {
        error:
          "X publishing is not configured. Add the X app credentials to the marketing app environment.",
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Content item not found" }, { status: 404 });
  }

  const item = toContentItem(data as Record<string, unknown>);
  if (item.twitter_post_id) {
    return NextResponse.json(
      { error: "This content item already has a stored X post id. Refresh before retrying." },
      { status: 409 },
    );
  }

  const postText = buildXPostText(item);
  if (!postText) {
    return NextResponse.json(
      { error: "Add content for the X post before publishing." },
      { status: 400 },
    );
  }

  try {
    const publishedPost = await publishTextPostToX(postText);
    const { data: updatedItem, error: updateError } = await supabase
      .from("content_items")
      .update({
        posted_twitter: true,
        twitter_post_text: postText,
        twitter_post_id: publishedPost.id,
        twitter_post_url: publishedPost.url,
        twitter_posted_at: new Date().toISOString(),
        twitter_last_error: null,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        {
          error: `Posted to X as ${publishedPost.id}, but failed to save the local record. Refresh before retrying to avoid a duplicate post.`,
          post: publishedPost,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      item: toContentItem((updatedItem ?? data) as Record<string, unknown>),
      post: publishedPost,
    });
  } catch (error) {
    const message = formatPublishError(error);
    await supabase.from("content_items").update({ twitter_last_error: message }).eq("id", id);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
