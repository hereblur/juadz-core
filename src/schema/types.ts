import {IACLActor} from '../types/acl';
import {IDataRecord} from '../types/crud';

export interface ISchemaViewTransform {
  (value: unknown, actor: IACLActor, record: IDataRecord): unknown;
}

export type ValidateAction = 'create' | 'update' | 'view' | 'replace';

export type Properties = {
  [field: string]: unknown;
};

export type ExtendedPropertiesSchema = Properties & {
  $virtual?: boolean;
  $create?: boolean | string;
  $patch?: boolean | string;
  $view?: boolean | string | ISchemaViewTransform;
  $required?: boolean;
  $allowedEmpty?: boolean;
};
