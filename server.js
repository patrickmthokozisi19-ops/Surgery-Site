
import http from "node:http";

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "application/json"
  });

  res.end(JSON.stringify({
    message: "Welcome to Pweb API!",
    status: "success"
  }));
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
