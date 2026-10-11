import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { styleText } from "node:util";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const publicDir = resolve(import.meta.dirname, "public");

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

    // Turn the URL path into a full file path inside public.
    // The "." makes the path relative, so resolve keeps publicDir in front.
    if (path === "/") {
      // '/' → 'public/index.html'
      filePath = resolve(publicDir, "index.html");
    } else if (path.includes(".")) {
      // '/style.css' → 'public/style.css'
      filePath = resolve(publicDir, `.${path}`);
    } else {
      // '/about' → 'public/about.html'
      filePath = resolve(publicDir, `.${path}.html`);
    }

    // Refuse any path that ends up outside the public folder.
    if (!filePath.startsWith(publicDir + sep)) {
      status = "403 Forbidden";
      body = "<h1>403: Not allowed</h1>";
      contentType = contentTypes[".html"];
    } else {
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
