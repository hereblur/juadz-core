import {IACLActor} from './acl';
import {IHttpJsonResponse} from './http';

export interface IAuthentication {
  authen: (content: IACLActor) => Promise<IHttpJsonResponse>;
  verify: (token: string) => Promise<IACLActor>;
  logout: (token: string) => Promise<void>;
}
