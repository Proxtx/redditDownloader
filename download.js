import fs from "fs";
import https from "https";
import http from "http";
import fsPromise from "fs/promises";

const dir = "download";

let protocols = {
  https,
  http,
};

export const downloadSavedPosts = async (posts) => {
  console.log("Downloading Posts!");
  let promises = [];
  for (let i of posts) {
    promises.push(downloadPost(i));
  }

  await Promise.all(promises);

  console.log("[", new Date().toISOString(), "]", "Done");
};

const downloadPost = async (post) => {
  try {
    let removeLetters = '/\\[]?<>|:&,’`"'.split("");
    let promises = [];
    let shortTitle = post.title.substring(0, 250);
    for (let i of removeLetters) {
      shortTitle = shortTitle.replaceAll(i, "");
    }

    try {
      await fsPromise.stat(dir + "/" + post.subreddit + "/" + shortTitle);
      return;
    } catch {
      await fsPromise.mkdir(dir + "/" + post.subreddit + "/" + shortTitle, {
        recursive: true,
      });
    }

    for (let i in post.downloads) {
      let fileExt;
      let protocol = new URL(post.downloads[i]).protocol.split(":")[0];
      let downloadSplit = new URL(post.downloads[i]).pathname.split(".");
      if (downloadSplit[downloadSplit.length - 1].length < 6)
        fileExt = downloadSplit[downloadSplit.length - 1];
      else {
        fileExt = new URL(post.downloads[i]).searchParams.get("format");
      }

      const file = fs.createWriteStream(
        dir + "/" + post.subreddit + "/" + shortTitle + "/" + i + "." + fileExt
      );
      let request = protocols[protocol].get(post.downloads[i], (res) =>
        res.pipe(file)
      );
      request.on("error", (e) => {
        console.log(
          "Error downloading: ",
          post.subreddit,
          post.title,
          post.downloads,
          e
        );
      });
      promises.push(
        new Promise((r) =>
          file.on("finish", () => {
            file.close();
            r();
          })
        )
      );
    }

    promises.push(
      fsPromise.writeFile(
        dir + "/" + post.subreddit + "/" + shortTitle + "/info.json",
        JSON.stringify(post, null, 2)
      )
    );

    return await Promise.all(promises);
  } catch (e) {
    console.log(
      "Error downloading: ",
      post.subreddit,
      post.title,
      post.downloads,
      e
    );
  }
};
