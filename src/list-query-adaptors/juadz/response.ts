import {
  IQueryListResults,
  IQueryParam,
  IQueryListResponse,
} from '../../types/crud';

export default function QueryListResponse(
  result: IQueryListResults,
  params: IQueryParam,
  name: string
): IQueryListResponse {
  return {
    headers: {
      'Content-Range': `${name} ${params.range.offset}-${
        params.range.offset + params.range.limit
      }/${result.total}`,
    },
    body: result.data,
  };
}
