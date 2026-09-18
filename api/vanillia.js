import { handleRequest } from "vanilliapxy";

export default function handler(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  url.pathname = "/vanillia";
  req.url = url.pathname + url.search;
  return handleRequest(req, res);
}
