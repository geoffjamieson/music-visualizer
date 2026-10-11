import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { styleText } from "node:util";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer((socket) => {
  console.log(styleText("cyan", "Someone connected!\n"));

  socket.on("data", (data) => {
    const request = data.toString();

    // get the first line out of request which has the method, path and version (looks like this 'GET /favicon.ico HTTP/1.1')
    const firstLine = request.split("\r\n")[0];

    // get method, path and version
    const [method, path, version] = firstLine.split(" ");

    console.log(styleText(["bold", "green"], `${method} ${path}`));
    console.log(styleText("gray", request));

    let status: string;
    let body: string;
    let contentType: string;
    let filePath: string;

    if (path === "/") {
      // '/' → 'public/index.html'
      filePath = "public/index.html";
    } else if (path.includes(".")) {
      // '/style.css' → 'public/style.css'
      filePath = `public${path}`;
    } else {
      // '/about' → 'public/about.html'
      filePath = `public${path}.html`;
    }

    try {
      status = "200 OK";
      body = readFileSync(filePath, "utf-8");
      contentType =
        contentTypes[extname(filePath)] ?? "application/octet-stream";
    } catch (error) {
      status = "404 Not Found";
      body = "<h1>404: Nothing here</h1>";
      contentType = contentTypes[".html"];
    }

    const response =
      `HTTP/1.1 ${status}\r\n` +
      `Content-Type: ${contentType}\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      "\r\n" +
      body;

    socket.write(response);
    socket.end();
  });
});

server.listen(3000, () => {
  console.log("Listening on port 3000\n");
});
