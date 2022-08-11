import Ajv, {JSONSchemaType, ValidateFunction} from 'ajv';
import {PropertiesSchema} from 'ajv/dist/types/json-schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {IDataRecord} from '../types/crud';
import {ErrorToHttp} from '../types/http';

const ajv = new Ajv();

interface ISchemaHookParams {
  actor?: IACLActor;
  record?: IDataRecord;
  resourceName?: string;
  fieldName?: string;
}

interface ISchemaHook {
  (action: string, value: unknown, params?: ISchemaHookParams):
    | unknown
    | Promise<unknown>;
}

interface SchemaOptions {
  isVirtual?: boolean;
  isTextSearch?: boolean;
  isScopeIndex?: boolean;
  isCreate?: boolean | string;
  isUpdate?: boolean | string;
  allowedEmpty?: boolean;
  isView?: boolean | string | ISchemaHook;
  isRequired?: boolean;

  hook?: ISchemaHook;
}

type ValidateAction = 'create' | 'update' | 'view';

type Properties = {
  [field: string]: unknown;
};
type ExtendedPropertiesSchema = Properties & {
  lz?: SchemaOptions;
};

interface FieldOptions {
  [key: string]: SchemaOptions;
}

const lzAction = (
  action: ValidateAction
): 'isCreate' | 'isUpdate' | 'isView' => {
  switch (action) {
    case 'create':
      return 'isCreate';
    case 'update':
      return 'isUpdate';
    case 'view':
      return 'isView';
  }
};

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

  options: FieldOptions = {};

  constructor(resourceName: string, fields: ExtendedPropertiesSchema) {
    this.fields = fields;
    this.resourceName = resourceName;

    Object.keys(fields).forEach(name => {
      const {lz = {}, ...field} = fields[name] as ExtendedPropertiesSchema;
      const properties: ExtendedPropertiesSchema = field;
      this.options[name] = lz;

      if (lz.isCreate !== false) {
        this.createSchema[name] = properties;
        if (lz.isRequired) {
          this.requiredFields.push(name);
        }
      }
      if (lz.isUpdate !== false) {
        this.updateSchema[name] = properties;
      }
      if (lz.isView !== false) {
        this.viewSchema[name] = properties;
      }
    });

    this.createValidator = ajv.compile(this.jsonSchema('create'));
    this.updateValidator = ajv.compile(this.jsonSchema('update'));
    this.viewValidator = ajv.compile(this.jsonSchema('view'));
  }

  getSearchFields() {
    return Object.keys(this.options).filter(f => this.options[f].isTextSearch);
  }

  jsonSchema(action: ValidateAction): JSONSchemaType<IDataRecord> {
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
    action: ValidateAction,
    data: IDataRecord,
    actor: IACLActor
  ): Promise<IDataRecord> {
    let pass = true;
    let errors = null;

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

    if (!mayi(actor, `${action}.${this.resourceName}`)) {
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    const output: IDataRecord = {};

    const valueKeys = Object.keys(data);

    await Promise.all(
      valueKeys.map(async fname => {
        const {lz = {}, ...field} = this.fields[
          fname
        ] as ExtendedPropertiesSchema;

        if (!field) {
          throw new ErrorToHttp(`Unknown field ${fname}`, 400, true);
        }

        if (lz[lzAction(action)] === false) {
          throw new ErrorToHttp(
            `Field ${fname} not allowed to ${action}.`,
            403,
            true
          );
        }

        if (typeof lz[lzAction(action)] === 'string') {
          if (!mayi(actor, lz[lzAction(action)] as string)) {
            throw new ErrorToHttp(
              `Permission denied to ${action} "${fname}".`,
              403,
              true
            );
          }
        }

        let patch: IDataRecord = lz.isVirtual ? {} : {[fname]: data[fname]};

        if (lz.hook) {
          const v = await lz.hook(action, data[fname], {
            record: data,
            actor,
            resourceName: this.resourceName,
            fieldName: fname,
          });

          if (typeof v === 'object') {
            patch = v as IDataRecord;
          } else {
            patch[fname] = v;
          }
        }

        Object.keys(patch).forEach(k => (output[k] = patch[k]));
      })
    );
    return output;
  }

  viewAs(data: IDataRecord, actor: IACLActor): IDataRecord {
    const output: IDataRecord = {};

    if (!data) {
      return data;
    }

    if (!mayi(actor, `view.${this.resourceName}`)) {
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    Object.keys(this.fields).forEach(fname => {
      const {lz = {}} = this.fields[fname] as ExtendedPropertiesSchema;

      if (!lz || lz.isView === false) {
        return;
      }

      if (typeof lz.isView === 'function') {
        output[fname] = lz.isView('view', data[fname], {
          record: data,
          actor,
          resourceName: this.resourceName,
          fieldName: fname,
        });
        return;
      }

      if (typeof lz.isView === 'string') {
        if (!mayi(actor, lz.isView)) {
          return;
        }
      }

      if (lz.isVirtual) {
        return;
      }

      // console.log(`data ${JSON.stringify(data, null, 2)}/${fname}`);
      output[fname] = data[fname];
    });

    return output;
  }
}

const helperTypes = (
  lz: SchemaOptions,
  baseType: string,
  extra: object = {}
) => {
  if (lz.allowedEmpty) {
    return {
      anyOf: [
        {type: baseType, ...extra},
        {type: 'null'},
        {type: 'string', maxLength: 0},
      ],
    };
  }

  return {type: baseType};
};

export const helpers = {
  string(lz: SchemaOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'string'), lz};
  },

  integer(lz: SchemaOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'number'), lz};
  },

  number(lz: SchemaOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'number'), lz};
  },

  dateTime(lz: SchemaOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'string', {format: 'date-time'}), lz};
  },

  boolean(lz: SchemaOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'boolean'), lz};
  },
};
