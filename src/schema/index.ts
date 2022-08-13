import Ajv, {JSONSchemaType, ValidateFunction} from 'ajv';
import {PropertiesSchema} from 'ajv/dist/types/json-schema';
import {mayi} from '../acl';
import {IACLActor} from '../types/acl';
import {IDataRecord} from '../types/crud';
import {ErrorToHttp} from '../types/http';

const ajv = new Ajv();

interface ISchemaActionHookParams {
  action: string;
  actor: IACLActor;
  raw: IDataRecord;
}

interface ISchemaActionHook {
  (data: IDataRecord, params: ISchemaActionHookParams):
    | IDataRecord
    | Promise<IDataRecord>;
}

interface ISchemaViewTransform {
  (value: unknown, actor: IACLActor, record: IDataRecord): unknown;
}

interface ISchemaFieldOptions {
  isVirtual?: boolean;
  isCreate?: boolean | string;
  isUpdate?: boolean | string;
  isView?: boolean | string | ISchemaViewTransform;
  isRequired?: boolean;
  allowedEmpty?: boolean;
}

interface ISchemaOptions {
  onCreate?: ISchemaActionHook;
  onUpdate?: ISchemaActionHook;
  onView?: ISchemaActionHook;
}

type ValidateAction = 'create' | 'update' | 'view';

type Properties = {
  [field: string]: unknown;
};
type ExtendedPropertiesSchema = Properties & {
  lz?: ISchemaFieldOptions;
};

interface FieldOptions {
  [key: string]: ISchemaFieldOptions;
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

  fieldOptions: FieldOptions = {};

  options: ISchemaOptions = {};

  constructor(
    resourceName: string,
    fields: ExtendedPropertiesSchema,
    schemaOptions?: ISchemaOptions
  ) {
    this.fields = fields;
    this.resourceName = resourceName;
    this.options = schemaOptions || {};

    Object.keys(fields).forEach(name => {
      const {lz = {}, ...field} = fields[name] as ExtendedPropertiesSchema;
      const properties: ExtendedPropertiesSchema = field;
      this.fieldOptions[name] = lz;

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

        const patch: IDataRecord = lz.isVirtual ? {} : {[fname]: data[fname]};

        Object.keys(patch).forEach(k => (output[k] = patch[k]));
      })
    );

    switch (action) {
      case 'create':
        if (this.options.onCreate) {
          return await this.options.onCreate(output, {
            raw: data,
            actor,
            action,
          });
        }
        break;
      case 'update':
        if (this.options.onUpdate) {
          return await this.options.onUpdate(output, {
            raw: data,
            actor,
            action,
          });
        }
        break;
      case 'view':
        if (this.options.onView) {
          return await this.options.onView(output, {
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

    if (!mayi(actor, `view.${this.resourceName}`)) {
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    Object.keys(this.fields).forEach(fname => {
      const {lz = {}} = this.fields[fname] as ExtendedPropertiesSchema;

      if (!lz || lz.isView === false) {
        return;
      }

      if (typeof lz.isView === 'function') {
        output[fname] = lz.isView(data[fname], actor, data);
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

      output[fname] = data[fname];
    });

    return output;
  }
}

const helperTypes = (
  lz: ISchemaFieldOptions,
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
  string(lz: ISchemaFieldOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'string'), lz};
  },

  integer(lz: ISchemaFieldOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'number'), lz};
  },

  number(lz: ISchemaFieldOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'number'), lz};
  },

  dateTime(lz: ISchemaFieldOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'string', {format: 'date-time'}), lz};
  },

  boolean(lz: ISchemaFieldOptions): ExtendedPropertiesSchema {
    return {...helperTypes(lz, 'boolean'), lz};
  },
};
