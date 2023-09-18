export interface IHttpJsonResponse {
  headers?: object;
  statusCode?: number;
  body: object;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface IResourceMethodsMapping {
  create: HttpMethod | null;
  replace: HttpMethod | null;
  update: HttpMethod | null;
  delete: HttpMethod | null;
  get: HttpMethod | null;
  list: HttpMethod | null;
}

export class ErrorToHttp extends Error {
  headers: object;
  statusCode: number;
  body: object;

  constructor(
    msg: string,
    statusCode = 500,
    body: object | null | boolean = null,
    headers: object = {}
  ) {
    super(msg);

    this.headers = headers;
    this.statusCode = statusCode;
    
    if (body === true) {
      this.body = {message: msg};
    } else {
      this.body = body || {message: 'Internal server error!'};
    }
    Object.setPrototypeOf(this, ErrorToHttp.prototype);
  }
}
