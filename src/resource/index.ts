import {ICrudModel, IDataRecord, IQueryParam} from '../types/crud';
import ResourceSchema from '../schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {ErrorToHttp} from '../types/http';

export default class JuadzResource {
  resourceName: string;
  schema: ResourceSchema;
  model: ICrudModel;
  scopeFieldName = '';
  dbConnection: unknown | Function;

  constructor(
    schema: ResourceSchema,
    model: ICrudModel,
    dbConnection: unknown | Function
  ) {
    this.resourceName = schema.resourceName;
    this.schema = schema;
    this.model = model;
    this.dbConnection = dbConnection;

    const scopeFieldNames = Object.keys(schema.options).filter(
      f => schema.options[f].isScopeIndex === true
    );
    if (scopeFieldNames.length > 1) {
      throw new Error(
        `Should have only one scope Index field [${schema.resourceName}]`
      );
    }

    this.scopeFieldName = scopeFieldNames[0] || '';
  }

  getConnection(action: string) {
    if (typeof this.dbConnection === 'function') {
      return this.dbConnection(this.resourceName, action);
    }

    return this.dbConnection;
  }

  async get(actor: IACLActor, id: string) {
    if (!mayi(actor, `view.${this.resourceName}`)) {
      throw new ErrorToHttp(
        `Permission denied view.${this.resourceName}`,
        403,
        {message: 'Permission denied'}
      );
    }

    const data = await this.model.get(this.getConnection('view'), id);

    return this.schema.viewAs(data, actor);
  }

  async update(actor: IACLActor, id: string, patch_: IDataRecord) {
    if (this.scopeFieldName && patch_[this.scopeFieldName]) {
      throw new Error(`Do not update ${this.scopeFieldName}`);
    }

    const patch = await this.schema.validate('update', patch_, actor);
    const data = await this.model.update(
      this.getConnection('update'),
      id,
      patch
    );
    return this.schema.viewAs(data, actor);
  }

  async create(actor: IACLActor, params_: IDataRecord) {
    if (!mayi(actor, `create.${this.resourceName}`)) {
      throw new ErrorToHttp(
        'Permission denied create.${this.resourceName}',
        403,
        {message: 'Permission denied'}
      );
    }

    const params = await this.schema.validate('create', params_, actor);

    if (this.scopeFieldName) {
      if (params[this.scopeFieldName]) {
        throw new Error(`Do not specify ${this.scopeFieldName}`);
      }
      params[this.scopeFieldName] = actor.scope;
    }
    const data = await this.model.create(this.getConnection('create'), params);
    return this.schema.viewAs(data, actor);
  }

  async delete(actor: IACLActor, id: string) {
    if (!mayi(actor, `delete.${this.resourceName}`)) {
      throw new ErrorToHttp(
        'Permission denied delete.${this.resourceName}',
        403,
        {message: 'Permission denied'}
      );
    }

    return await this.model.delete(this.getConnection('delete'), id);
  }

  async list(actor: IACLActor, params: IQueryParam) {
    if (!mayi(actor, `view.${this.resourceName}`)) {
      throw new ErrorToHttp(
        'Permission denied view.${this.resourceName}',
        403,
        {message: 'Permission denied'}
      );
    }

    const {total, data} = await this.model.list(
      this.getConnection('view'),
      params
    );

    return {
      total,
      data: data.map((row: IDataRecord) => this.schema.viewAs(row, actor)),
    };
  }
}
