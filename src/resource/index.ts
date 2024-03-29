import {
  IDatabaseModel,
  IDataRecord,
  IQueryAdaptor,
  IQueryParam,
  ResourceAction,
} from '../types/crud';
import ResourceSchema from '../schema';
import { mayi } from '../acl';
import { IACLActor } from '../types/acl';
import { ErrorToHttp, HttpMethod, IResourceMethodsMapping } from '../types/http';
import { ISchemaHook } from '../schema/hook';
import { endpointWithIDSchema, listParamsSchema } from './endpoints';
import { IResourceEndpoint, IResourceHandlerParams } from '../types/common';

export default class JuadzResource {
  resourceName: string;
  private _permissionName: string;
  schema: ResourceSchema;
  dbModel: IDatabaseModel | null = null;
  availableActions: Array<ResourceAction>;

  static defaultMethodsMapping: IResourceMethodsMapping = {
    create: 'POST',
    replace: 'PUT',
    update: 'PATCH',
    delete: 'DELETE',
    get: 'GET',
    list: 'GET',
  };

  static defaultAvailableActions: Array<ResourceAction> = [
    'create',
    'get',
    'update',
    'delete',
    'list',
    'replace',
  ];

  methodsMapping: IResourceMethodsMapping = {
    create: 'POST',
    replace: 'PUT',
    update: 'PATCH',
    delete: 'DELETE',
    get: 'GET',
    list: 'GET',
  };

  endpoints: IResourceEndpoint[] = [];

  private afterCreateHook: ISchemaHook | null = null;
  private afterReplaceHook: ISchemaHook | null = null;
  private afterUpdateHook: ISchemaHook | null = null;
  private afterDeleteHook: ISchemaHook | null = null;

  constructor(schema: ResourceSchema) {
    this.resourceName = schema.resourceName;
    this.schema = schema;
    this._permissionName = schema.permissionName || schema.resourceName;
    this.availableActions = [...JuadzResource.defaultAvailableActions];
    this.methodsMapping = {...JuadzResource.defaultMethodsMapping};
  }

  have(s: ResourceAction) {
    return this.availableActions.indexOf(s) !== -1;
  }

  getEndpoints(listAdaptor?: IQueryAdaptor ): IResourceEndpoint[] {
    const endpoints: IResourceEndpoint[] = [];

    if (this.methodsMapping.get && this.have('get')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.get || 'GET',

        tags: [this.resourceName],
        description: `Get ${this.resourceName} by id`,
        
        paramsSchema: endpointWithIDSchema,
        responseSchema: this.schema.viewSchema,
    
        handler: async (request: IResourceHandlerParams) => {
          const result = await this.get(request.actor, request.params?.id || 'undefined');
          return {
            body: result,
          }
        }
      });
    }

    if (this.methodsMapping.update && this.have('update')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.update,

        tags: [this.resourceName],
        description: `Update ${this.resourceName} by id`,
        
        paramsSchema: endpointWithIDSchema,
        bodySchema: this.schema.getJsonSchema('update'), // this.schema.updateSchema,
        responseSchema: this.schema.viewSchema,
    
        handler: async (request: IResourceHandlerParams) => {
          const result = await this.update(request.actor, request.params?.id || 'undefined', request.body as IDataRecord);    
          return {
            body: result,
          }
        }
      });
    }

    if (this.methodsMapping.replace && this.have('replace')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.replace,
        
        tags: [this.resourceName],
        description: `Replace ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        bodySchema: this.schema.getJsonSchema('replace'), //: this.schema.replaceSchema,
        responseSchema: this.schema.viewSchema,
    
        handler: async (request: IResourceHandlerParams) => {
          const result = await this.replace(request.actor, request.params?.id || 'undefined', request.body as IDataRecord);    
          return {
            body: result,
          }
        }
      });
    }

    if (this.methodsMapping.create && this.have('create')) {
      endpoints.push({
        path: '',
        method: this.methodsMapping.create,
        
        tags: [this.resourceName],
        description: `Create ${this.resourceName}`,

        bodySchema: this.schema.getJsonSchema('create'), // this.schema.createSchema,
        responseSchema: this.schema.viewSchema,
    
        handler: async (request: IResourceHandlerParams) => {
          const result = await this.create(request.actor, request.body as IDataRecord);    
          return {
            body: result,
          }
        }
      });
    }

    if (this.methodsMapping.delete && this.have('delete')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.delete,
        
        tags: [this.resourceName],
        description: `Delete ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        responseSchema: this.schema.viewSchema,

        handler: async (request: IResourceHandlerParams) => {
          const result = await this.delete(request.actor, request.params?.id || 'undefined');
          return {
            body: {},
            headers: {'x-deleted-id': `${result}` }
          }
        }
      });
    }

    if (this.methodsMapping.list && listAdaptor && this.have('list')) {
      endpoints.push({
        path: '',
        method: this.methodsMapping.list,

        tags: [this.resourceName],
        description: `Get list of ${this.resourceName}`,
        
        querySchema: listParamsSchema(listAdaptor.params),
        responseSchema: {
          type: 'array',
          item: {
            type: 'object',
            additionalProperties: false,
            properties: this.schema.viewSchema,
          },
        },
    
        handler: async (request: IResourceHandlerParams) => {
          if (!listAdaptor) {
            throw new ErrorToHttp('ListAdaptor not defined');
          }
          const params = listAdaptor.parser(
            this.resourceName,
            request.query as object
          );
          const result = await this.list(request.actor, params);
          const response = listAdaptor.response(
            result,
            params,
            this.resourceName
          );

          return {
            body: response.body,
            headers: response.headers as object,
          }
        }
      });
    }

    return [...endpoints, ...this.endpoints];
  }

  addEndpoints(endpoint: IResourceEndpoint) {
    this.endpoints.push(endpoint);
  }

  getConnection(): IDatabaseModel {
    if (!this.dbModel) {
      throw new Error(`No database defined for resource ${this.resourceName}`);
    }

    return this.dbModel;
  }

  checkDatabaseMethod(dbModel: IDatabaseModel, action: string) {
    let haveModelFn = false;
    switch (action) {
      case 'get':
        haveModelFn = !!dbModel.get;
        break;
      case 'update':
        haveModelFn = !!dbModel.update;
        break;
      case 'replace':
        haveModelFn = !!dbModel.replace;
        break;
      case 'create':
        haveModelFn = !!dbModel.create;
        break;
      case 'delete':
        haveModelFn = !!dbModel.delete;
        break;
      case 'list':
        haveModelFn = !!dbModel.list;
        break;
    }

    if (!haveModelFn) {
      console.error(`Model not defined ${this.resourceName}.${action}, found [${Object.keys(dbModel).join(', ')}]}]`)
      throw new ErrorToHttp(
        `Model not defined ${this.resourceName}.${action}`,
        404,
        {
          message: 'Not found.',
        }
      );
    }
  }

  async _get(id: string | number): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'get');
    if (!conn.get) {
      throw new Error('Model.get is not defined');
    }

    return await conn.get(id);
  }

  async get(actor: IACLActor, id: string | number): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'get');

    if (!mayi(actor, `view.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const data = await this._get(id);

    // const data_ = await this.schema.validate('view', data, actor, id);
    return await this.schema.viewAs(data, actor);
  }

  async _update(
    id: string | number,
    update: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'update');

    if (!conn.update) {
      throw new Error('Model.update is not defined');
    }

    return await conn.update(id, update);
  }

  async update(
    actor: IACLActor,
    id: string | number,
    update_: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'update');

    if (!mayi(actor, `update.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied update.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const update = await this.schema.validate('update', update_, actor, id);
    const data = await this._update(id, update);

    if (this.afterUpdateHook) {
      this.afterUpdateHook(data, {
        resourceName: this.resourceName,
        action: 'update',
        actor,
        raw: update,
        id: data.id,
      });
    }

    return await this.schema.viewAs(data, actor);
  }

  async _create(params: IDataRecord): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'create');

    if (!conn.create) {
      throw new Error('Model.create is not defined');
    }

    return await conn.create(params);
  }

  async create(actor: IACLActor, params_: IDataRecord): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'create');

    if (!mayi(actor, `create.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied create.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const params = await this.schema.validate('create', params_, actor);
    const data = await this._create(params);

    if (this.afterCreateHook) {
      this.afterCreateHook(data, {
        resourceName: this.resourceName,
        action: 'create',
        actor,
        raw: params,
        id: data.id,
      });
    }

    return await this.schema.viewAs(data, actor);
  }

  async _replace(
    id: string | number,
    params: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'replace');

    if (!conn.replace) {
      throw new Error('Model.replace is not defined');
    }

    return await conn.replace(id, params);
  }

  async replace(
    actor: IACLActor,
    id: string | number,
    params_: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'replace');

    if (!mayi(actor, `replace.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied replace.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const params = await this.schema.validate('replace', params_, actor);
    const data = await this._replace(id, params);

    if (this.afterReplaceHook) {
      this.afterReplaceHook(data, {
        resourceName: this.resourceName,
        action: 'replace',
        actor,
        raw: params,
        id: data.id,
      });
    }

    return await this.schema.viewAs(data, actor);
  }

  async _delete(id: string | number) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'delete');

    if (!conn.delete) {
      throw new Error('Model.delete is not defined');
    }

    return await conn.delete(id);
  }

  async delete(actor: IACLActor, id: string | number) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'delete');

    if (!mayi(actor, `delete.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied delete.${this.resourceName}`,
        403,
        {message: 'Permission denied'}
      );
    }
    await this.schema.validate('delete', {}, actor, id);

    if (this.afterDeleteHook) {
      this.afterDeleteHook(
        {id},
        {
          resourceName: this.resourceName,
          action: 'delete',
          actor,
          raw: {id},
          id: id,
        }
      );
    }

    return await this._delete(id);
  }

  async _list(params: IQueryParam) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'list');

    if (!conn.list) {
      throw new Error('Model.list is not defined');
    }

    const {total, data} = await conn.list(params);

    return {total, data};
  }

  async list(actor: IACLActor, params: IQueryParam) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'list');

    if (!mayi(actor, `view.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const {total, data} = await this._list(params);
    const data_ = await Promise.all(
      data.map(async (row: IDataRecord) => {
        // const row_ = await this.schema.validate('view', row, actor)
        return await this.schema.viewAs(row, actor)
      })
    );

    return {
      total,
      data: data_//.map((row: IDataRecord) => this.schema.viewAs(row, actor)),
    };
  }

  set beforeCreate(h: ISchemaHook) {
    this.schema.beforeCreate = h;
  }
  set beforeUpdate(h: ISchemaHook) {
    this.schema.beforeUpdate = h;
  }
  set beforeDelete(h: ISchemaHook) {
    this.schema.beforeDelete = h;
  }
  set afterView(h: ISchemaHook) {
    this.schema.afterView = h;
  }

  set afterCreate(h: ISchemaHook) {
    this.afterCreateHook = h;
  }
  set afterReplace(h: ISchemaHook) {
    this.afterReplaceHook = h;
  }
  set afterUpdate(h: ISchemaHook) {
    this.afterUpdateHook = h;
  }
  set afterDelete(h: ISchemaHook) {
    this.afterDeleteHook = h;
  }
  set httpMethodCreate(m: HttpMethod | null) {
    this.methodsMapping.create = m;
  }
  set httpMethodReplace(m: HttpMethod | null) {
    this.methodsMapping.replace = m;
  }
  set httpMethodUpdate(m: HttpMethod | null) {
    this.methodsMapping.update = m;
  }
  set httpMethodDelete(m: HttpMethod | null) {
    this.methodsMapping.delete = m;
  }
  set httpMethodGet(m: HttpMethod | null) {
    this.methodsMapping.get = m;
  }
  set httpMethodList(m: HttpMethod | null) {
    this.methodsMapping.list = m;
  }

  toggleActions(action: ResourceAction, shouldHave: boolean) {
    if (shouldHave && !this.have(action)) {
      this.availableActions.push(action);
    } else 
    if (!shouldHave && this.have(action)) {
      this.availableActions.splice(this.availableActions.indexOf(action), 1);
    }
  }

  set haveCreate(have: boolean) {
    this.toggleActions('create', have);
  }
  set haveReplace(have: boolean) {
    this.toggleActions('replace', have);
  }
  set haveUpdate(have: boolean) {
    this.toggleActions('update', have);
  }
  set haveDelete(have: boolean) {
    this.toggleActions('delete', have);
  }
  set haveGet(have: boolean) {
    this.toggleActions('get', have);
  }
  set haveList(have: boolean) {
    this.toggleActions('list', have);
  }

  set model(d: IDatabaseModel) {
    this.dbModel = d;

    const actions: ResourceAction[] = [];
    if (this.dbModel.create) {
      actions.push('create');
    }
    if (this.dbModel.update) {
      actions.push('update');
    }
    if (this.dbModel.replace) {
      actions.push('replace');
    }
    if (this.dbModel.delete) {
      actions.push('delete');
    }
    if (this.dbModel.get) {
      actions.push('get');
    }
    if (this.dbModel.list) {
      actions.push('list');
    }

    this.availableActions = actions;
  }

  set permissionName(p: string) {
    this._permissionName = p;
    this.schema.permissionName = p;
  }

  get permissionName(): string {
    return this._permissionName;
  }
}
