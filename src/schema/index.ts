import Ajv, {JSONSchemaType, ValidateFunction} from 'ajv';
import AjvFormats from 'ajv-formats';
import {PropertiesSchema} from 'ajv/dist/types/json-schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {IDataRecord} from '../types/crud';
import {ErrorToHttp} from '../types/http';
import {ISchemaHook} from './hook';
import {getFlags, stripFlags} from './quick';
import {ExtendedPropertiesSchema, ValidateAction} from './types';
export {helpers} from './quick';

const ajv = new Ajv();
AjvFormats(ajv);

export default class ResourceSchema {
  createSchema: ExtendedPropertiesSchema = {};

  updateSchema: ExtendedPropertiesSchema = {};

  viewSchema: ExtendedPropertiesSchema = {};

  createValidator?: ValidateFunction;

  viewValidator?: ValidateFunction;

  updateValidator?: ValidateFunction;

  fields: ExtendedPropertiesSchema;

  resourceName: string;

  requiredFields: Array<string> = [];

  // fieldOptions: ExtendedPropertiesSchema = {};

  private _permissionName: string;
  private beforeCreateHook: ISchemaHook | null = null;
  private beforeUpdateHook: ISchemaHook | null = null;
  private afterViewHook: ISchemaHook | null = null;
  private beforeDeleteHook: ISchemaHook | null = null;

  constructor(resourceName: string, fields: ExtendedPropertiesSchema) {
    this.fields = fields;
    this.resourceName = resourceName;
    // this.options = schemaOptions || {};
    this._permissionName = resourceName;

    Object.keys(fields).forEach(name => {
      const {$create, $update, $view, $required} = getFlags(
        fields[name] as ExtendedPropertiesSchema
      );
      const properties = stripFlags(fields[name] as ExtendedPropertiesSchema);

      // this.fieldOptions[name] = { $virtual, $create, $update, $view, $required, $allowedEmpty };

      if ($create !== false) {
        this.createSchema[name] = properties;
        if ($required) {
          this.requiredFields.push(name);
        }
      }
      if ($update !== false) {
        this.updateSchema[name] = properties;
      }
      if ($view !== false) {
        this.viewSchema[name] = properties;
      }
    });

    this.createValidator = ajv.compile(this.getJsonSchema('create'));
    this.updateValidator = ajv.compile(this.getJsonSchema('update'));
    this.viewValidator = ajv.compile(this.getJsonSchema('view'));
  }

  getJsonSchema(action: ValidateAction): JSONSchemaType<IDataRecord> {
    switch (action) {
      case 'create':
        return {
          type: 'object',
          additionalProperties: false,
          properties: (this.createSchema ||
            {}) as PropertiesSchema<IDataRecord>,
          required: this.requiredFields as Array<never>,
        };

      case 'update':
        return {
          type: 'object',
          additionalProperties: false,
          properties: (this.updateSchema ||
            {}) as PropertiesSchema<IDataRecord>,
        };

      case 'view':
        return {
          type: 'object',
          additionalProperties: false,
          properties: (this.viewSchema || {}) as PropertiesSchema<IDataRecord>,
        };
    }
  }

  async validate(
    action: ValidateAction | 'delete',
    data: IDataRecord,
    actor: IACLActor,
    updatingId?: number | string | unknown
  ): Promise<IDataRecord> {
    let pass = true;
    let errors = null;

    if (action === 'delete') {
      if (this.beforeDeleteHook) {
        await this.beforeDeleteHook(
          {},
          {action, actor, id: updatingId, raw: {}}
        );
      }
      return {};
    }

    switch (action) {
      case 'create':
        pass = this.createValidator ? this.createValidator(data) : pass;
        errors = this.createValidator ? this.createValidator.errors : errors;
        break;
      case 'update':
        pass = this.updateValidator ? this.updateValidator(data) : pass;
        errors = this.updateValidator ? this.updateValidator.errors : errors;
        break;
      case 'view':
        pass = this.viewValidator ? this.viewValidator(data) : pass;
        errors = this.viewValidator ? this.viewValidator.errors : errors;
        break;
    }

    if (!pass) {
      if (errors) {
        throw new ErrorToHttp('Validate failed', 400, {
          message: 'Invalid input',
          errors,
        });
      }
    }

    if (!mayi(actor, `${action}.${this._permissionName}`)) {
      // console.log(JSON.stringify(actor), `${action}.${this._permissionName}`);
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    const output: IDataRecord = {};

    const valueKeys = Object.keys(data);

    await Promise.all(
      valueKeys.map(async fname => {
        const {$virtual, $create, $update, $view} = getFlags(
          this.fields[fname] as ExtendedPropertiesSchema
        );
        const field = stripFlags(
          this.fields[fname] as ExtendedPropertiesSchema
        );

        const hooks: ExtendedPropertiesSchema = {$create, $update, $view};

        if (!field) {
          throw new ErrorToHttp(`Unknown field ${fname}`, 400, true);
        }

        if (hooks[`${action}`] === false) {
          throw new ErrorToHttp(
            `Field ${fname} not allowed to ${action}.`,
            403,
            true
          );
        }

        // console.log(fname, action, hooks[`\$${action}`], 'FFF', this.fields[fname], hooks)
        if (typeof hooks[`$${action}`] === 'string') {
          const permission = hooks[`$${action}`] as string;
          //console.log(fname, mayi(actor, permission), actor, permission, actor.permissions.includes(permission))
          if (!mayi(actor, permission)) {
            throw new ErrorToHttp(
              `Permission denied to ${action} "${fname}".`,
              403,
              true
            );
          }
        }

        const patch: IDataRecord = $virtual ? {} : {[fname]: data[fname]};

        Object.keys(patch).forEach(k => (output[k] = patch[k]));
      })
    );

    switch (action) {
      case 'create':
        if (this.beforeCreateHook) {
          return await this.beforeCreateHook(output, {
            raw: data,
            actor,
            action,
          });
        }
        break;
      case 'update':
        if (this.beforeUpdateHook) {
          return await this.beforeUpdateHook(output, {
            raw: data,
            actor,
            action,
            id: updatingId,
          });
        }
        break;
      case 'view':
        if (this.afterViewHook) {
          return await this.afterViewHook(output, {
            raw: data,
            actor,
            action,
          });
        }
        break;
    }

    return output;
  }

  viewAs(data: IDataRecord, actor: IACLActor): IDataRecord {
    const output: IDataRecord = {};

    if (!data) {
      return data;
    }

    if (!mayi(actor, `view.${this._permissionName}`)) {
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    Object.keys(this.fields).forEach(fname => {
      const {$virtual, $view} = this.fields[fname] as ExtendedPropertiesSchema;

      if ($view === false) {
        return;
      }

      // console.log(fname, typeof $view, $view, this.fields[fname]);
      if (typeof $view === 'function') {
        output[fname] = $view(data[fname], actor, data);
        return;
      }

      if (typeof $view === 'string') {
        if (!mayi(actor, $view)) {
          return;
        }
      }

      if ($virtual) {
        return;
      }

      output[fname] = data[fname];
    });

    return output;
  }

  set beforeCreate(h: ISchemaHook) {
    this.beforeCreateHook = h;
  }
  set beforeUpdate(h: ISchemaHook) {
    this.beforeUpdateHook = h;
  }
  set afterView(h: ISchemaHook) {
    this.afterViewHook = h;
  }
  set beforeDelete(h: ISchemaHook) {
    this.beforeDeleteHook = h;
  }

  set permissionName(p: string) {
    this._permissionName = p;
  }

  get permissionName(): string {
    return this._permissionName;
  }
}
