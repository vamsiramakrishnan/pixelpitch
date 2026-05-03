import { protocol } from "electron";

const PIXELPITCH_SCHEME = "pixelpitch";
const PIXELPITCH_ENTRY_URL = `${PIXELPITCH_SCHEME}://app/`;

protocol.registerSchemesAsPrivileged([
  {
    privileges: {
      corsEnabled: true,
      secure: true,
      standard: true,
      stream: true,
      supportFetchAPI: true,
    },
    scheme: PIXELPITCH_SCHEME,
  },
]);

function toWebRuntimeUrl(webRuntimeUrl: string, requestUrl: string): string {
  const incoming = new URL(requestUrl);
  const target = new URL(webRuntimeUrl);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  target.hash = incoming.hash;
  return target.toString();
}

export function packagedEntryUrl(): string {
  return PIXELPITCH_ENTRY_URL;
}

export function registerOdProtocol(webRuntimeUrl: string): void {
  protocol.handle(PIXELPITCH_SCHEME, async (request) => {
    const target = toWebRuntimeUrl(webRuntimeUrl, request.url);
    return await fetch(new Request(target, request));
  });
}
