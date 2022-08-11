import {IDataRecord} from '../types/crud';
import ResourceSchema, {helpers} from './index';

test('create schema', () => {
  let sch = new ResourceSchema('test', {
    string: {type: 'string', lz: {isRequired: true}},
    integer: {type: 'integer', lz: {isRequired: true}},
    number: {type: 'number', lz: {isRequired: true}},
    dateTime: {type: 'string', lz: {isRequired: true}},
    boolean: {type: 'boolean', lz: {isRequired: true}},
  });

  let json = sch.jsonSchema('create');

  expect(json.properties.string).toMatchObject({type: 'string'});
  expect(json.properties.integer).toMatchObject({type: 'integer'});
  expect(json.properties.number).toMatchObject({type: 'number'});
  expect(json.properties.dateTime).toMatchObject({type: 'string'});
  expect(json.properties.boolean).toMatchObject({type: 'boolean'});

  sch = new ResourceSchema('test', {
    string: helpers.string({isRequired: true}),
    integer: helpers.integer({isRequired: true}),
    number: helpers.number({isRequired: true}),
    dateTime: helpers.dateTime({isRequired: true}),
    boolean: helpers.boolean({isRequired: true}),
  });

  json = sch.jsonSchema('create');

  expect(json.properties.string).toMatchObject({type: 'string'});
  expect(json.properties.integer).toMatchObject({type: 'number'});
  expect(json.properties.number).toMatchObject({type: 'number'});
  expect(json.properties.dateTime).toMatchObject({type: 'string'});
  expect(json.properties.boolean).toMatchObject({type: 'boolean'});
});

test('filterView', () => {
  const sch = new ResourceSchema('test', {
    string: helpers.string({isRequired: true}),
    integer: helpers.integer({isRequired: true}),
    reverse: helpers.string({
      isRequired: true,
      isView: (_action: string, value: unknown) => `${value}`.toUpperCase(),
    }),
    secret: helpers.string({isRequired: true, isView: false}),
    restricted: helpers.string({
      isRequired: true,
      isView: 'view.test.restricted',
    }),
  });

  const data = {
    string: 'public',
    integer: 9,
    reverse: 'abcd',
    secret: 'nobody-see-me',
    restricted: 'only-allowed',
  };

  const result1 = sch.viewAs(data, {
    scope: '',
    permissions: ['view.test', 'view.test.restricted'],
  });

  expect(result1).toMatchObject({
    string: 'public',
    integer: 9,
    reverse: 'ABCD',
    restricted: 'only-allowed',
  });

  expect(result1).not.toHaveProperty(['secret']);

  const result2 = sch.viewAs(data, {
    scope: '',
    permissions: ['view.test'],
  });

  expect(result2).toMatchObject({
    string: 'public',
    integer: 9,
    reverse: 'ABCD',
  });

  expect(result2).not.toHaveProperty(['secret']);
});

test('beforeSave', async () => {
  const sch = new ResourceSchema('test', {
    string: helpers.string({}),
    upperCase: helpers.string({
      hook: (action: string, v: unknown): unknown => `${v}`.toUpperCase(),
    }),
    virtual: helpers.string({
      isVirtual: true,
      hook: (action: string, v: unknown): unknown => ({hashed: `hased[${v}]`}),
    }),
    restricted: helpers.string({
      isCreate: false,
      isUpdate: 'update.test.god',
      hook: (action: string, v: unknown): unknown => `${v}`.toUpperCase(),
    }),
  });

  const data = {
    string: 'public',
    upperCase: 'abcd',
    virtual: 'VirTualz',
  };

  const result1 = await sch.validate('update', data, {
    scope: '',
    permissions: ['update.test'],
  });

  expect(result1).toMatchObject({
    string: 'public',
    upperCase: 'ABCD',
    hashed: 'hased[VirTualz]',
  });

  expect(result1).not.toHaveProperty(['virtual']);

  await sch
    .validate('create', data, {
      scope: '',
      permissions: ['update.test'],
    })
    .then(v => {
      expect(v).toBe('Error!');
    })
    .catch(e => {
      expect(e).toMatchObject({message: 'Permission denied'});
    });

  await sch
    .validate(
      'update',
      {...data, restricted: 'hacked'},
      {
        scope: '',
        permissions: ['update.test'],
      }
    )
    .then(v => {
      expect(v).toBe('Error!');
    })
    .catch(e => {
      expect(e).toMatchObject({
        message: 'Permission denied to update "restricted".',
      });
    });

  await sch
    .validate(
      'update',
      {...data, restricted: 'hacked'},
      {
        scope: '',
        permissions: ['update.test', 'update.test.god'],
      }
    )
    .catch(e => {
      expect(e).toMatchObject({
        message: 'Permission denied to update "restricted"',
      });
    });
});
