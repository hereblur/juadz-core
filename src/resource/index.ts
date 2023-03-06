import {ICrudModel, IDataRecord, IQueryParam} from '../types/crud';
import ResourceSchema from '../schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {ErrorToHttp, HttpMethod, IResourceMethodsMapping} from '../types/http';
import {ISchemaHook} from '../schema/hook';

export default class JuadzResource {
  resourceName: string;
  permissionName: string;
  schema: ResourceSchema;
  model: ICrudModel;
  dbConnection: unknown | Function;

  methodsMapping: IResourceMethodsMapping = {
    create: "POST",
    replace: "PUT",
    patch: "PATCH",
    delete: "DELETE",
    view: "GET",
    list: "GET",
  };

  private afterCreateHook: ISchemaHook | null = null;
  private afterReplaceHook: ISchemaHook | null = null;
  private afterPatchHook: ISchemaHook | null = null;
  private afterDeleteHook: ISchemaHook | null = null;

  constructor(
    schema: ResourceSchema,
    model: ICrudModel,
    dbConnection: unknown | Function
  ) {
    this.resourceName = schema.resourceName;
    this.schema = schema;
    this.model = model;
    this.dbConnection = dbConnection;
    this.permissionName = schema.permissionName || schema.resourceName;
  }

  getConnection(action: string) {
    if (typeof this.dbConnection === 'function') {
      return this.dbConnection(this.resourceName, action);
    }

    return this.dbConnection;
  }

  checkModelAction(action: string) {
    let haveModelFn = false;
    switch (action) {
      case 'get':
        haveModelFn = !!this.model.get;
        break;
      case 'patch':
        haveModelFn = !!this.model.patch;
        break;
      case 'replace':
        haveModelFn = !!this.model.replace;
        break;
      case 'create':
        haveModelFn = !!this.model.create;
        break;
      case 'delete':
        haveModelFn = !!this.model.delete;
        break;
      case 'list':
        haveModelFn = !!this.model.list;
        break;
    }
    if (!haveModelFn) {
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
    this.checkModelAction('get');

    if (!this.model.get) {
      throw new Error('Model.get is not defined');
    }

    return await this.model.get(this.getConnection('view'), id);
  }

  async get(actor: IACLActor, id: string | number): Promise<IDataRecord> {
    this.checkModelAction('get');

    if (!mayi(actor, `view.${this.permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this.permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const data = await this._get(id);

    return this.schema.viewAs(data, actor);
  }

  async _patch(id: string | number, patch: IDataRecord): Promise<IDataRecord> {
    this.checkModelAction('patch');

    if (!this.model.patch) {
      throw new Error('Model.patch is not defined');
    }

    return await this.model.patch(this.getConnection('patch'), id, patch);
  }

  async patch(
    actor: IACLActor,
    id: string | number,
    patch_: IDataRecord
  ): Promise<IDataRecord> {
    this.checkModelAction('patch');
    const patch = await this.schema.validate('patch', patch_, actor, id);
    const data = await this._patch(id, patch);

    if (this.afterPatchHook) {
      this.afterPatchHook(data, {
        action: 'patch',
        actor,
        raw: patch,
        id: data.id,
      });
    }

    return this.schema.viewAs(data, actor);
  }

  async _create(params: IDataRecord): Promise<IDataRecord> {
    this.checkModelAction('create');

    if (!this.model.create) {
      throw new Error('Model.create is not defined');
    }

    return await this.model.create(this.getConnection('create'), params);
  }

  async create(actor: IACLActor, params_: IDataRecord): Promise<IDataRecord> {
    this.checkModelAction('create');

    if (!mayi(actor, `create.${this.permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied create.${this.permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const params = await this.schema.validate('create', params_, actor);
    const data = await this._create(params);

    if (this.afterCreateHook) {
      this.afterCreateHook(data, {
        action: 'create',
        actor,
        raw: params,
        id: data.id,
      });
    }

    return this.schema.viewAs(data, actor);
  }

  async _replace(id: string | number, params: IDataRecord): Promise<IDataRecord> {
    this.checkModelAction('replace');

    if (!this.model.replace) {
      throw new Error('Model.replace is not defined');
    }

    return await this.model.replace(this.getConnection('replace'), id, params);
  }

  async replace(actor: IACLActor, id: string | number, params_: IDataRecord): Promise<IDataRecord> {
    this.checkModelAction('replace');

    if (!mayi(actor, `replace.${this.permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied replace.${this.permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const params = await this.schema.validate('replace', params_, actor);
    const data = await this._replace(id, params);

    if (this.afterReplaceHook) {
      this.afterReplaceHook(data, {
        action: 'replace',
        actor,
        raw: params,
        id: data.id,
      });
    }

    return this.schema.viewAs(data, actor);
  }

  async _delete(id: string | number) {
    this.checkModelAction('delete');

    if (!this.model.delete) {
      throw new Error('Model.delete is not defined');
    }

    return await this.model.delete(this.getConnection('delete'), id);
  }

  async delete(actor: IACLActor, id: string | number) {
    this.checkModelAction('delete');

    if (!mayi(actor, `delete.${this.permissionName}`)) {
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
    this.checkModelAction('list');

    if (!this.model.list) {
      throw new Error('Model.list is not defined');
    }

    const {total, data} = await this.model.list(
      this.getConnection('view'),
      params
    );

    return {total, data};
  }

  async list(actor: IACLActor, params: IQueryParam) {
    this.checkModelAction('list');

    if (!mayi(actor, `view.${this.permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this.permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const {total, data} = await this._list(params);

    return {
      total,
      data: data.map((row: IDataRecord) => this.schema.viewAs(row, actor)),
    };
  }

  set beforeCreate(h: ISchemaHook) {
    this.schema.beforeCreate = h;
  }
  set beforePatch(h: ISchemaHook) {
    this.schema.beforePatch = h;
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
  set afterPatch(h: ISchemaHook) {
    this.afterPatchHook = h;
  }
  set afterDelete(h: ISchemaHook) {
    this.afterDeleteHook = h;
  }
  setCreateHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.create = m;
  }
  setReplaceHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.replace = m;
  }
  setPatchHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.patch = m;
  }
  setDeleteHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.delete = m;
  }
  setViewHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.view = m;
  }
  setListHttpMethod(m: HttpMethod | null) {
    this.methodsMapping.list = m;
  }
}
