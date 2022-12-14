import Snoowrap from "snoowrap";
import { downloadSavedPosts } from "./download.js";
import fs from "fs/promises";

const config = JSON.parse(await fs.readFile("config.json", "utf-8"));

const r = await new Snoowrap(config.bot);

const parsePost = (post) => {
  try {
    let res = {
      subreddit: post.subreddit.display_name,
      title:
        post.title +
        (post.created_utc > 1671042843846 ? "_" + post.created_utc : ""),
      author: post.author.name,
      link: post.permalink,
      time: Date.now(),
      downloads: [],
    };

    if (post?.crosspost_parent_list?.[0]) {
      post = post.crosspost_parent_list[0];
    }

    if (post?.media?.reddit_video?.fallback_url) {
      res.downloads = [post.secure_media.reddit_video.fallback_url];
    } else if (post.preview && post.preview.reddit_video_preview)
      res.downloads = [post.preview.reddit_video_preview.fallback_url];
    else if (post.gallery_data)
      for (let i of post.gallery_data.items)
        res.downloads.push(
          post.media_metadata[i.media_id].s.u
            ? post.media_metadata[i.media_id].s.u
            : post.media_metadata[i.media_id].s.gif
        );
    else if (post.domain == "redgifs.com")
      res.downloads = [
        post.media.oembed.thumbnail_url
          .replace("jpg", "mp4")
          .replace("png", "mp4"),
      ];
    else if (post.url) res.downloads = [post.url];
    else {
      res.downloads = "https://notFound.notFound/notFound.null";
    }

    return res;
  } catch (e) {
    console.log(post);
    throw new Error(e);
  }
};

const generateParsedSaves = async () => {
  console.log("[", new Date().toISOString(), "]", "Fetching posts!");
  let mode = config.mode ? config.mode : "saved";
  let posts;
  let limit = config.limit ? { limit: config.limit } : { limit: Infinity };
  if (mode == "saved") {
    posts = await r.getMe().getSavedContent(limit);
  } else if (mode == "subreddit") {
    posts = await r.getSubreddit(config.subreddit).getNew(limit);
  }
  let svd = [];
  for (let i of posts) svd.push(parsePost(i));
  return svd;
};

while (true) {
  await downloadSavedPosts(await generateParsedSaves());
  await new Promise((r) => setTimeout(r, config.interval));
}
