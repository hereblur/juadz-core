import { ExtendedPropertiesSchema } from "../schema/types";


export const endpointWithIDSchema = {
    type: 'object',
    properties: {
        id: {type: 'string'},
    },
    required: ['id'],
};

export function listParamsSchema(params: Array<string>): ExtendedPropertiesSchema {
    const result: ExtendedPropertiesSchema = {};
    params.forEach(p => {
      result[p] = { type: 'string' };
    });
    return result;
  }
  
