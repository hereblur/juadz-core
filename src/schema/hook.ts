import {IACLActor} from '../types/acl';
import {IDataRecord} from '../types/crud';

export interface ISchemaHookParams {
  resourceName: string;
  action: string;
  actor: IACLActor;
  raw: IDataRecord;
  id?: number | string | unknown;
}

export interface ISchemaHook {
  (data: IDataRecord, params: ISchemaHookParams):
    | IDataRecord
    | Promise<IDataRecord>;
}
