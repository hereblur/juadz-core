import {mayi} from '../acl';
import useNoneAuth from './none-auth';

interface AnyObject {
  [k: string]: unknown;
}

test('noneAuth auth', async () => {
  const noneAuth = useNoneAuth('I allow this guy to do what ever he want!!');

  const response = await noneAuth.authen();
  expect((response.body as AnyObject).bearerToken).toBe('none');
  const actor = await noneAuth.verify();
  expect(mayi(actor, 'create.things')).toBe(true);
  expect(mayi(actor, 'create.somethingselse')).toBe(true);

  const badNoneAuth = useNoneAuth('something else');
  const actor2 = await badNoneAuth.verify();
  expect(mayi(actor2, 'create.things')).toBe(false);
  expect(mayi(actor2, 'create.somethingselse')).toBe(false);
});
