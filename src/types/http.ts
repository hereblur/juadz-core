export interface IHttpJsonResponse {
  headers?: object;
  statusCode?: number;
  body: object;
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
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrorToHttp.prototype);
  }

  sayHello() {
    return 'hello ' + this.message;
  }
}
