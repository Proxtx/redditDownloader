import Snoowrap from "snoowrap";
import { downloadSavedPosts } from "./download.js";
import fs from "fs/promises";

const config = JSON.parse(await fs.readFile("config.json", "utf-8"));

const r = await new Snoowrap(config.bot);

const parsePost = (post) => {
  try {
    let res = {
      subreddit: post.subreddit.display_name,
      title: post.title,
      author: post.author.name,
      link: post.permalink,
      time: Date.now(),
      downloads: [],
    };

    if (post.preview && post.preview.reddit_video_preview)
      res.downloads = [post.preview.reddit_video_preview.fallback_url];
    else if (post.gallery_data)
      for (let i of post.gallery_data.items)
        res.downloads.push(
          post.media_metadata[i.media_id].s.u
            ? post.media_metadata[i.media_id].s.u
            : post.media_metadata[i.media_id].s.gif
        );
    else if (post.url) res.downloads = [post.url];
    else res.downloads = [post.url_overridden_by_dest];

    return res;
  } catch (e) {
    console.log(post);
    throw new Error(e);
  }
};

const generateParsedSaves = async () => {
  console.log("[", new Date().toISOString(), "]", "Fetching posts!");
  let saved = await r.getMe().getSavedContent({ limit: Infinity });
  let svd = [];
  for (let i of saved) svd.push(parsePost(i));
  return svd;
};

while (true) {
  await downloadSavedPosts(await generateParsedSaves());
  await new Promise((r) => setTimeout(r, config.interval));
}
