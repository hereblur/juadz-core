import {IQueryListResults, IQueryListResponse} from '../../types/crud';

export default function QueryListResponse(
  result: IQueryListResults
): IQueryListResponse {
  return {
    headers: {
      'x-total-count': `${result.total}`,
    },
    body: result.data,
  };
}
