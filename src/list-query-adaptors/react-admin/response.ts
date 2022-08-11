import {
  IQueryListResults,
  IQueryParam,
  IQueryListResponse,
} from '../../types/crud';

export default function QueryListResponse(
  result: IQueryListResults,
  params: IQueryParam
): IQueryListResponse {
  return {
    headers: {
      'Content-Range': `${params.resource} ${params.range.offset}-${
        params.range.offset + params.range.limit
      }/${result.total}`,
    },
    body: result.data,
  };
}
