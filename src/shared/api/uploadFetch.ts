/**
 * Expo's global `fetch` cannot send React Native's local files (`{ uri, name, type }` parts in a
 * FormData), so photo uploads failed before reaching the server. Multipart requests go through
 * React Native's XMLHttpRequest, which reads those files natively; everything else keeps `fetch`.
 */

/** The FormData body the request was built with (React Native's Request keeps it in `_bodyInit`). */
export function formDataBody(request: Request): FormData | null {
  const body = (request as Request & { _bodyInit?: unknown })._bodyInit;
  return typeof FormData !== 'undefined' && body instanceof FormData ? body : null;
}

function parseHeaders(raw: string): Headers {
  const headers = new Headers();
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const index = line.indexOf(':');
    if (index > 0) headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim());
  }
  return headers;
}

function sendWithXhr(request: Request, body: FormData): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method, request.url, true);
    request.headers.forEach((value, key) => {
      // The boundary is set by XMLHttpRequest itself.
      if (key.toLowerCase() !== 'content-type') xhr.setRequestHeader(key, value);
    });
    xhr.onload = () =>
      resolve(
        new Response(xhr.status === 204 ? null : xhr.responseText, {
          status: xhr.status,
          headers: parseHeaders(xhr.getAllResponseHeaders()),
        }),
      );
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));
    xhr.send(body);
  });
}

export function uploadAwareFetch(request: Request): Promise<Response> {
  const body = formDataBody(request);
  return body ? sendWithXhr(request, body) : fetch(request);
}
