// https://refine.dev/docs/core/interfaceReferences/#crudfilters
// https://refine.dev/docs/core/interfaceReferences/#crudsorting

import {
  IQueryFilter,
  QueryFilterOperator,
  IQueryParam,
  IQueryRange,
  IQuerySort,
} from '../../types/crud';

const opsMap = {
  eq: '=',
  ne: '!=',
  lt: '<',
  gt: '>',
  lte: '<=',
  gte: '>=',
  in: 'in',
  nin: '!in',
  contains: 'contains',
  ncontains: '!contains',
  containss: null,
  ncontainss: null,
  between: null,
  nbetween: null,
  null: null,
  nnull: null,
};

type FilterValue = string | number | Array<string | number | Date>;

interface RefineFilter {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'lt'
    | 'gt'
    | 'lte'
    | 'gte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'ncontains'
    | 'containss'
    | 'ncontainss'
    | 'between'
    | 'nbetween'
    | 'null'
    | 'nnull';
  value: FilterValue;
}

interface RefineSort {
  field: string;
  order: string;
}

interface RefineRange {
  current: number;
  pageSize: number;
}

interface RefineParams {
  filters: string | Array<RefineFilter>;
  pagination: string | RefineRange;
  sort: string | RefineSort;
}

function parseFilter(filter: string | object): Array<IQueryFilter> {
  let filterObj: Array<RefineFilter> = [];
  if (typeof filter === 'string') {
    filterObj = JSON.parse(filter);
  } else {
    filterObj = filter as Array<RefineFilter>;
  }

  return filterObj
    .map(({field, operator, value}): Array<IQueryFilter> => {
      if (opsMap[operator]) {
        return [
          {
            field,
            op: opsMap[operator] as QueryFilterOperator,
            value,
          },
        ];
      }

      switch (operator) {
        case 'between':
          return [
            {
              field,
              op: '>=',
              value: (value as Array<string | number | Date>)[0],
            },
            {
              field,
              op: '<=',
              value: (value as Array<string | number | Date>)[1],
            },
          ];
        case 'nbetween':
          return [
            {
              field,
              op: '<=',
              value: (value as Array<string | number | Date>)[0],
            },
            {
              field,
              op: '>=',
              value: (value as Array<string | number | Date>)[1],
            },
          ];
      }

      throw new Error(
        `Filter not support '${field}': ${JSON.stringify(value)}`
      );
    })
    .reduce((acc: Array<IQueryFilter>, each: Array<IQueryFilter>) => {
      return [...acc, ...each];
    }, []);
}

function parseRange(range: string | RefineRange): IQueryRange {
  if (typeof range === 'string') {
    range = JSON.parse(range) as RefineRange;
  }

  return {
    offset: (range.current - 1) * range.pageSize,
    limit: range.pageSize,
  } as IQueryRange;
}

function parseSort(sort: string | RefineSort): IQuerySort {
  if (typeof sort === 'string') {
    sort = JSON.parse(sort) as RefineSort;
  }

  return {
    field: sort.field,
    direction: sort.order.toUpperCase(),
  } as IQuerySort;
}

export default function FilterParser(
  resource: string,
  queryString: object
): IQueryParam {
  const params = queryString as RefineParams;
  return {
    resource,
    filter: parseFilter(params.filters || {}),
    range: parseRange(params.pagination || {current: 1, pageSize: 30}),
    sort: [parseSort(params.sort || {field: 'id', order: 'asc'})],
  };
}
