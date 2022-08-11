import {IACLActor} from '../types/acl';
import {ErrorToHttp, IHttpJsonResponse} from '../types/http';

// magicPhaseToEnsureYouReallyWantThis = 'I allow this guy to do what ever he want!!'
export default function useNoneAuth(
  magicPhaseToEnsureYouReallyWantThis: string
) {
  return {
    authen: async (): Promise<IHttpJsonResponse> => {
      return {
        headers: {},
        body: {
          bearerToken: 'none',
        },
      };
    },
    verify: async (): Promise<IACLActor> => {
      return {
        $$_NO_SECURITY_$$: magicPhaseToEnsureYouReallyWantThis,
        permissions: [],
      };
    },
    logout: async (): Promise<void> => {
      throw new ErrorToHttp('Logout is not supported for JWT auth', 403, {
        message: 'Logout failed',
      });
    },
  };
}
