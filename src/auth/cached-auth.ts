import {randomUUID} from 'crypto';
import JuadzCache from '../cache';
import {IACLActor} from '../types/acl';
import {IHttpJsonResponse, ErrorToHttp} from '../types/http';

export default function useCachedAuth(
  cache: JuadzCache,
  sessionAgeSeconds: number
) {
  return {
    authen: async (actor: IACLActor): Promise<IHttpJsonResponse> => {
      const sessionId = randomUUID();
      const key = `auth.token.${sessionId}`;
      await cache.put(key, actor, sessionAgeSeconds);

      return {
        headers: {},
        body: {
          bearerToken: sessionId,
        },
      };
    },
    verify: async (token: string): Promise<IACLActor> => {
      const key = `auth.token.${token}`;
      const payload = await cache.get(key);

      if (!payload) {
        throw new ErrorToHttp('Session invalid or expires', 401, {
          message: 'Session invalid or expires',
        });
      }

      return payload as IACLActor;
    },
    logout: async (token: string): Promise<void> => {
      const key = `auth.token.${token}`;
      await cache.delete(key);
    },
  };
}
