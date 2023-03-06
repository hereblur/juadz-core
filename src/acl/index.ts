import {IACLActor} from '../types/acl';

export function mayi(actor: IACLActor, action: string): boolean {
  if (!actor || !actor.permissions || !actor.permissions) {
    return false;
  }

  return actor.permissions.includes(action);
}
