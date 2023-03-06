import {IACLActor} from '../types/acl';

export function mayi(
  actor: IACLActor,
  action: string | Array<string>
): boolean {
  if (!actor || !actor.permissions || !actor.permissions) {
    return false;
  }

  if (!Array.isArray(action)) {
    return actor.permissions.includes(action);
  }

  return action.reduce((passed, act) => {
    return passed || actor.permissions.includes(act);
  }, false);
}
