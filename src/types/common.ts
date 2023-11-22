import { ExtendedPropertiesSchema } from "../schema/types";
import { IACLActor } from "./acl";
import { ResourceAction } from "./crud";

export type ResourceHandler = (request: IResourceHandlerParams) => Promise<IResourceEndpointReponse>;

export interface StringObject {
    [key: string]: string;
}

export interface IResourceHandlerParams {
    method : String;
    path: String;
    
    query?: StringObject | null;
    params?: StringObject | null;
    body?: object | null;
    headers?: StringObject | null;
    
    actor: IACLActor;

    request?: unknown;
}

export interface IResourceEndpointReponse {
    headers?: object;
    statusCode?: number;
    body?: object;
}

export interface IResourceEndpoint {
    path: string;
    method: string;
    action?: ResourceAction;
    authentication?: string;

    tags?: Array<string>;
    description?: string;
    
    querySchema?: ExtendedPropertiesSchema;
    paramsSchema?: ExtendedPropertiesSchema;
    bodySchema?: ExtendedPropertiesSchema;
    responseSchema?: ExtendedPropertiesSchema;

    handler: ResourceHandler;
}
