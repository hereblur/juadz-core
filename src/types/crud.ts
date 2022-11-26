import {IACLActor} from './acl';

export type QueryFilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | '!in'
  | 'contains'
  | '!contains'
  | 'between'
  | '!between'
  | 'null'
  | '!null';

export interface IQueryFilter {
  field: string;
  op: QueryFilterOperator;

  value: number | string | Date | Array<number | string | Date>;
}

export interface IQueryRange {
  offset: number;
  limit: number;
}

export interface IQuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface IQueryParam {
  resource: string;
  filter: Array<IQueryFilter>;
  range: IQueryRange;
  sort: Array<IQuerySort>;
}

export interface IQueryListResults {
  data: Array<IDataRecord>;
  total: number;
}
export interface IQueryListFunction {
  (
    connection: unknown,
    params: IQueryParam,
    acl: IACLActor
  ): Promise<IQueryListResults>;
}

export interface IQueryListResponse {
  body: Array<IDataRecord>;
  headers?: IDataRecord;
}

export interface IDataRecord {
  [key: string]: unknown;
}

export interface ICrudModel {
  get?: (
    connection: unknown,
    id: string | number,
    acl: IACLActor
  ) => Promise<IDataRecord>;
  update?: (
    connection: unknown,
    id: string | number,
    patch: IDataRecord,
    acl: IACLActor
  ) => Promise<IDataRecord>;
  create?: (
    connection: unknown,
    data: IDataRecord,
    acl: IACLActor
  ) => Promise<IDataRecord>;
  delete?: (
    connection: unknown,
    id: string | number,
    acl: IACLActor
  ) => Promise<number>;
  list?: IQueryListFunction;
}

export interface IQueryAdaptor {
  parser: (resource: string, queryString: object) => IQueryParam;
  response: (
    result: IQueryListResults,
    params: IQueryParam,
    name: string
  ) => IQueryListResponse;
  params: Array<string>;
}
