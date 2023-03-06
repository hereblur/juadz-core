import {
  DatabaseConnectionGetter,
  IDatabaseConnection,
  IDataRecord,
  IQueryParam,
} from '../types/crud';
import ResourceSchema from '../schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {ErrorToHttp, HttpMethod, IResourceMethodsMapping} from '../types/http';
import {ISchemaHook} from '../schema/hook';

export default class JuadzResource {
  resourceName: string;
  private _permissionName: string;
  schema: ResourceSchema;
  dbConnection: IDatabaseConnection | DatabaseConnectionGetter | null = null;

  methodsMapping: IResourceMethodsMapping = {
    create: 'POST',
    replace: 'PUT',
    update: 'PATCH',
    delete: 'DELETE',
    view: 'GET',
    list: 'GET',
  };

  private afterCreateHook: ISchemaHook | null = null;
  private afterReplaceHook: ISchemaHook | null = null;
  private afterUpdateHook: ISchemaHook | null = null;
  private afterDeleteHook: ISchemaHook | null = null;

  constructor(schema: ResourceSchema) {
    this.resourceName = schema.resourceName;
    this.schema = schema;
    this._permissionName = schema.permissionName || schema.resourceName;
  }

  getConnection(action: string): IDatabaseConnection {
    if (!this.dbConnection) {
      throw new Error(`No database defined for resource ${this.resourceName}`);
    }
    if (typeof this.dbConnection === 'function') {
      return this.dbConnection(this.resourceName, action);
    }

    return this.dbConnection;
  }

  checkDatabaseMethod(dbConnection: IDatabaseConnection, action: string) {
    let haveModelFn = false;
    switch (action) {
      case 'get':
        haveModelFn = !!dbConnection.get;
        break;
      case 'update':
        haveModelFn = !!dbConnection.update;
        break;
      case 'replace':
        haveModelFn = !!dbConnection.replace;
        break;
      case 'create':
        haveModelFn = !!dbConnection.create;
        break;
      case 'delete':
        haveModelFn = !!dbConnection.delete;
        break;
      case 'list':
        haveModelFn = !!dbConnection.list;
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
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'get');
    if (!conn.get) {
      throw new Error('Model.get is not defined');
    }

    return await conn.get(id);
  }

  async get(actor: IACLActor, id: string | number): Promise<IDataRecord> {
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'get');

    if (!mayi(actor, `view.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this._permissionName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const data = await this._get(id);

    return this.schema.viewAs(data, actor);
  }

  async _update(
    id: string | number,
    update: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection('update');
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
    const conn = this.getConnection('update');
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

    return this.schema.viewAs(data, actor);
  }

  async _create(params: IDataRecord): Promise<IDataRecord> {
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'create');

    if (!conn.create) {
      throw new Error('Model.create is not defined');
    }

    return await conn.create(params);
  }

  async create(actor: IACLActor, params_: IDataRecord): Promise<IDataRecord> {
    const conn = this.getConnection('view');
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

    return this.schema.viewAs(data, actor);
  }

  async _replace(
    id: string | number,
    params: IDataRecord
  ): Promise<IDataRecord> {
    const conn = this.getConnection('view');
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
    const conn = this.getConnection('view');
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

    return this.schema.viewAs(data, actor);
  }

  async _delete(id: string | number) {
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'delete');

    if (!conn.delete) {
      throw new Error('Model.delete is not defined');
    }

    return await conn.delete(id);
  }

  async delete(actor: IACLActor, id: string | number) {
    const conn = this.getConnection('view');
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
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'list');

    if (!conn.list) {
      throw new Error('Model.list is not defined');
    }

    const {total, data} = await conn.list(params);

    return {total, data};
  }

  async list(actor: IACLActor, params: IQueryParam) {
    const conn = this.getConnection('view');
    this.checkDatabaseMethod(conn, 'list');

    if (!mayi(actor, `view.${this._permissionName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this._permissionName}`,
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
  set httpMethodView(m: HttpMethod | null) {
    this.methodsMapping.view = m;
  }
  set httpMethodList(m: HttpMethod | null) {
    this.methodsMapping.list = m;
  }

  set database(d: IDatabaseConnection | DatabaseConnectionGetter) {
    this.dbConnection = d;
  }

  set permissionName(p: string) {
    this._permissionName = p;
    this.schema.permissionName = p;
  }

  get permissionName(): string {
    return this._permissionName;
  }
}
