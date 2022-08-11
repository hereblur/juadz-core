import {
  IQueryFilter,
  IQueryParam,
  IQueryRange,
  IQuerySort,
} from '../../types/crud';

interface RequestParams {
  filter: string | Array<IQueryFilter>;
  range: string | IQueryRange;
  sort: string | IQuerySort;
}

function parseFilter(filter: string | object): Array<IQueryFilter> {
  let filterObj: Array<IQueryFilter> = [];
  if (typeof filter === 'string') {
    filterObj = JSON.parse(filter);
  }

  return filterObj;
}

function parseRange(range: string | IQueryRange): IQueryRange {
  if (typeof range === 'string') {
    return JSON.parse(range) as IQueryRange;
  }
  return range;
}

function parseSort(sort: string | IQuerySort): IQuerySort {
  if (typeof sort === 'string') {
    return JSON.parse(sort) as IQuerySort;
  }

  return sort;
}

export default function FilterParser(
  resource: string,
  queryString: object
): IQueryParam {
  const params = queryString as RequestParams;

  return {
    resource,
    filter: parseFilter(params.filter || {}),
    range: parseRange(params.range || {offset: 0, limit: 30}),
    sort: [parseSort(params.sort || {field: 'id', direction: 'ASC'})],
  };
}
