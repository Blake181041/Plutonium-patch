import { handleWorkerRequest } from "vanilliapxy/worker";

export function onRequest(context) {
  return handleWorkerRequest(context.request);
}
