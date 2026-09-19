import { server } from "vanilliapxy";

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST || "0.0.0.0";

server.listen(port, host, () => {
  console.log(`VanilliaPXY is listening on ${host}:${port}`);
});
