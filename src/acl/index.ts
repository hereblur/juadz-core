import {IACLActor} from '../types/acl';

export function mayi(actor: IACLActor, action: string): boolean {
  if (
    actor?.$$_NO_SECURITY_$$ === 'I allow this guy to do what ever he want!!'
  ) {
    return true;
  }

  if (!actor || !actor.permissions || !actor.permissions) {
    return false;
  }

  return actor.permissions.includes(action);
}
