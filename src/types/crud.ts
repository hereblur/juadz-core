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

export type ResourceAction = 'create' | 'get' | 'update' | 'delete' | 'list' | 'replace';


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
  (params: IQueryParam): Promise<IQueryListResults>;
}

export interface IQueryListResponse {
  body: Array<IDataRecord>;
  headers?: IDataRecord;
}

export interface IDataRecord {
  [key: string]: unknown;
}

export interface IPlainObject {
  [key: string]: unknown;
}

export interface IDatabaseModel {
  get?: (id: string | number) => Promise<IDataRecord>;
  update?: (id: string | number, patch: IDataRecord) => Promise<IDataRecord>;
  replace?: (id: string | number, data: IDataRecord) => Promise<IDataRecord>;
  create?: (data: IDataRecord) => Promise<IDataRecord>;
  delete?: (id: string | number) => Promise<number>;
  list?: IQueryListFunction;
}

export type DatabaseModelGetter = (
  resourceName: string,
  action: string
) => IDatabaseModel;

export interface IQueryAdaptor {
  parser: (resource: string, queryString: object) => IQueryParam;
  response: (
    result: IQueryListResults,
    params: IQueryParam,
    name: string
  ) => IQueryListResponse;
  params: Array<string>;
}
