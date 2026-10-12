import { formDataBody, uploadAwareFetch } from '../uploadFetch';

class FakeXhr {
  static last: FakeXhr;
  headers: Record<string, string> = {};
  method = '';
  url = '';
  body: unknown;
  status = 201;
  responseText = '{"id":"1"}';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  constructor() {
    FakeXhr.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }
  getAllResponseHeaders() {
    return 'content-type: application/json\r\nx-request-id: r1\r\n';
  }
  send(body: unknown) {
    this.body = body;
  }
}

const realXhr = globalThis.XMLHttpRequest;
beforeEach(() => {
  globalThis.XMLHttpRequest = FakeXhr as never;
});
afterAll(() => {
  globalThis.XMLHttpRequest = realXhr;
});

const multipart = (form: FormData) => {
  const request = new Request('http://api.test/api/v1/photo', {
    method: 'POST',
    headers: { Authorization: 'Bearer t', 'Content-Type': 'multipart/form-data' },
  });
  Object.assign(request, { _bodyInit: form });
  return request;
};

describe('uploadAwareFetch', () => {
  it('sends multipart bodies through XMLHttpRequest, without forcing the content type', async () => {
    const form = new FormData();
    const pending = uploadAwareFetch(multipart(form));
    const xhr = FakeXhr.last;
    expect(xhr.method).toBe('POST');
    expect(xhr.body).toBe(form);
    expect(xhr.headers.authorization).toBe('Bearer t');
    expect(Object.keys(xhr.headers)).not.toContain('content-type');
    xhr.onload!();
    const response = await pending;
    expect(response.status).toBe(201);
    expect(response.headers.get('X-Request-Id')).toBe('r1');
    expect(await response.json()).toEqual({ id: '1' });
  });

  it('reports a network failure like fetch does', async () => {
    const pending = uploadAwareFetch(multipart(new FormData()));
    FakeXhr.last.onerror!();
    await expect(pending).rejects.toThrow(TypeError);
  });

  it('leaves other requests to fetch', async () => {
    const spy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const request = new Request('http://api.test/x');
    expect(formDataBody(request)).toBeNull();
    await uploadAwareFetch(request);
    expect(spy).toHaveBeenCalledWith(request);
  });
});
