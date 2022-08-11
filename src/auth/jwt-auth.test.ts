import {ErrorToHttp} from '../types/http';
import useJwtAuth from './jwt-auth';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface AnyObject {
  [k: string]: unknown;
}

test('jwt auth', async () => {
  const jwt = useJwtAuth(
    'secret$$$$',
    {
      expiresIn: '1s',
    },
    {}
  );
  const actor = {
    name: 'test',
    permissions: ['a', 'b', 'c', 'd'],
  };

  const response = await jwt.authen(actor);
  expect((response.body as AnyObject).bearerToken).toBeTruthy();

  const token = (response.body as AnyObject).bearerToken;

  const result = await jwt.verify(token as string);
  expect(result).toMatchObject(actor);

  await sleep(1001);
  try {
    const failed = await jwt.verify(token as string);
    expect(failed).toBeNull();
  } catch (error) {
    const e = error as ErrorToHttp;
    expect(e.statusCode).toBe(401);
  }
});
