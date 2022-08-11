import {
  IQueryFilter,
  IQueryParam,
  IQueryRange,
  IQuerySort,
} from '../../types/crud';

export interface ReactAdminParams {
  filter?: string | object;
  range?: string | Array<number>;
  sort?: string | Array<string>;
}

// Deprecated
interface RaRangeFilter {
  min?: number;
  max?: number;
  begin?: number | Date | string;
  end?: number | Date | string;
  since?: number | Date | string;
  until?: number | Date | string;
  after?: number | Date | string;
  before?: number | Date | string;
}

interface RaFilter {
  [field: string]: string | number | RaRangeFilter;
}

function parseFilter(filter: string | object): Array<IQueryFilter> {
  let filterObj: RaFilter = {};
  if (typeof filter === 'string') {
    filterObj = JSON.parse(filter);
  } else {
    filterObj = filter as RaFilter;
  }

  const filters: Array<IQueryFilter> = [];

  Object.keys(filterObj).forEach(field => {
    const value = filterObj[field as string];
    switch (typeof value) {
      case 'string':
      case 'number':
        filters.push({field, op: '=', value});
        return;
    }

    if (Array.isArray(value)) {
      filters.push({field, op: 'in', value});
      return;
    }

    // Deprecated
    if (typeof value === 'object') {
      let handled = false;
      if (value.min || value.begin || value.since) {
        handled = true;
        filters.push({
          field,
          op: '>=',
          value: value.min || value.begin || value.since || '',
        });
      }

      if (value.max || value.end || value.until) {
        handled = true;
        filters.push({
          field,
          op: '<=',
          value: value.max || value.end || value.until || '',
        });
      }

      if (value.after) {
        handled = true;
        filters.push({field, op: '>', value: value.after});
      }

      if (value.before) {
        handled = true;
        filters.push({field, op: '<', value: value.before});
      }

      if (handled) {
        return;
      }
    }

    throw new Error(`Filter not support '${field}': ${JSON.stringify(value)}`);
  });

  return filters;
}

function parseRange(range: string | Array<number>): IQueryRange {
  if (typeof range === 'string') {
    range = JSON.parse(range);
  }

  return {
    offset: range[0],
    limit: range[1],
  } as IQueryRange;
}

function parseSort(sort: string | Array<string>): IQuerySort {
  if (typeof sort === 'string') {
    sort = JSON.parse(sort);
  }

  return {
    field: sort[0],
    direction: sort[1],
  } as IQuerySort;
}

export default function FilterParser(
  resource: string,
  queryString: object
): IQueryParam {
  const params = queryString as ReactAdminParams;
  return {
    resource,
    filter: parseFilter(params.filter || {}),
    range: parseRange(params.range || [0, 30]),
    sort: [parseSort(params.sort || ['id', 'ASC'])],
  };
}
