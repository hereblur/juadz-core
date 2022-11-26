import {IACLActor} from './acl';
import {IHttpJsonResponse} from './http';

export interface IAuthentication {
  authen: (content: IACLActor) => Promise<IHttpJsonResponse>;
  verify: (token: string, data?: unknown) => Promise<IACLActor>;
  logout: (token: string, actor?: IACLActor) => Promise<void>;
}
