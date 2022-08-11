import {IACLActor} from '../types/acl';
import {mayi} from './index';

test('ACL', () => {
  const actor: IACLActor = {
    permissions: [
      'create.things',
      'update.things',
      'delete.things',
      'view.things',
    ],
  };

  expect(mayi(actor, 'create.things')).toBe(true);
  expect(mayi(actor, 'create.somethingselse')).toBe(false);
});
