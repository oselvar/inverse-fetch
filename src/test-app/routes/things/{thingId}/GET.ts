import { type FetchHandler, FetchHelper } from '../../../../index.js';

// Assigned automatically by file-based routing
export let pathPattern: string;

export const handler: FetchHandler = async (input, init) => {
  const helper = new FetchHelper(pathPattern, input, init);
  const { thingId } = helper.params();
  return new Response(`hello ${thingId}`);
};
