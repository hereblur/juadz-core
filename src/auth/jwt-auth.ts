import {Secret, sign, verify, SignOptions, VerifyOptions} from 'jsonwebtoken';
import {IACLActor} from '../types/acl';
import {ErrorToHttp, IHttpJsonResponse} from '../types/http';

interface KeyPair {
  privateKey: string;
  publicKey: string;
  passphrase?: string;
}

export default function useJWT(
  secret: string | KeyPair,
  signOptions: SignOptions,
  verifyOptions: VerifyOptions
) {
  return {
    authen: async (actor: IACLActor): Promise<IHttpJsonResponse> => {
      let secretOrPrivateKey: Secret;
      if (typeof secret === 'object') {
        if (secret.passphrase) {
          secretOrPrivateKey = {
            key: secret.privateKey,
            passphrase: secret.passphrase,
          };
        } else {
          secretOrPrivateKey = secret.privateKey;
        }
      } else {
        secretOrPrivateKey = secret;
      }

      const jwtToken = sign(actor, secretOrPrivateKey, signOptions);
      return {
        headers: {},
        body: {
          jwtToken,
          bearerToken: `Bearer ${jwtToken}`,
        },
      };
    },
    verify: async (token: string): Promise<IACLActor> => {
      let secretOrPublicKey: Secret;
      if (typeof secret === 'object') {
        if (secret.passphrase) {
          secretOrPublicKey = {
            key: secret.publicKey,
            passphrase: secret.passphrase,
          };
        } else {
          secretOrPublicKey = secret.publicKey;
        }
      } else {
        secretOrPublicKey = secret;
      }

      try {
        return verify(
          token.replace(/^Bearer /gi, ''),
          secretOrPublicKey,
          verifyOptions
        ) as IACLActor;
      } catch (error) {
        throw new ErrorToHttp((error as Error).message, 401, {
          message: 'Session invalid or expires',
        });
      }
    },
    logout: async (): Promise<void> => {
      throw new ErrorToHttp('Logout is not supported for JWT auth', 403, {
        message: 'Logout failed',
      });
    },
  };
}
