import {ExtendedPropertiesSchema} from './types';

export const stripFlags = (
  schema: ExtendedPropertiesSchema
): ExtendedPropertiesSchema => {
  const schema_ = {...schema};
  delete schema_.$virtual;
  delete schema_.$create;
  delete schema_.$update;
  delete schema_.$view;
  delete schema_.$required;
  delete schema_.$allowedEmpty;

  return schema_;
};

export const getFlags = (
  schema: ExtendedPropertiesSchema
): ExtendedPropertiesSchema => {
  const {$virtual, $create, $update, $view, $required, $allowedEmpty} = schema;
  return {$virtual, $create, $update, $view, $required, $allowedEmpty};
};

const helperTypes = (
  baseType: string,
  extra: ExtendedPropertiesSchema = {}
) => {
  const plainSchema = stripFlags(extra);

  if (extra.$allowedEmpty) {
    return {
      anyOf: [
        {type: baseType, ...extra, ...plainSchema},
        {type: 'null'},
        {type: 'string', maxLength: 0},
      ],
    };
  }

  return {type: baseType, ...extra, ...plainSchema};
};

export const helpers = {
  string(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', {maxLength: 255, ...lz})};
  },

  text(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', lz)};
  },

  integer(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('integer', lz)};
  },

  number(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('number', lz)};
  },

  dateTime(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', {format: 'date-time', ...lz})};
  },

  boolean(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('boolean', lz)};
  },

  email(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', {format: 'email', ...lz})};
  },

  url(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', {format: 'uri', ...lz})};
  },

  uri(lz: ExtendedPropertiesSchema = {}): ExtendedPropertiesSchema {
    return {...helperTypes('string', {format: 'uri', ...lz})};
  },

  enum(enumValues: Array<string>): ExtendedPropertiesSchema {
    return {...helperTypes('string', {enum: enumValues})};
  },
};
