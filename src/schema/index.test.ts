import ResourceSchema, {helpers} from './index';

test('create schema', () => {
  let sch = new ResourceSchema('test', {
    string: {type: 'string', $required: true},
    integer: {type: 'integer', $required: true},
    number: {type: 'number', $required: true},
    dateTime: {type: 'string', $required: true},
    boolean: {type: 'boolean', $required: true},
  });

  let json = sch.getJsonSchema('create');

  expect(json.properties.string).toMatchObject({type: 'string'});
  expect(json.properties.integer).toMatchObject({type: 'integer'});
  expect(json.properties.number).toMatchObject({type: 'number'});
  expect(json.properties.dateTime).toMatchObject({type: 'string'});
  expect(json.properties.boolean).toMatchObject({type: 'boolean'});

  sch = new ResourceSchema('test', {
    string: helpers.string({$required: true}),
    integer: helpers.integer({$required: true}),
    number: helpers.number({$required: true}),
    dateTime: helpers.dateTime({$required: true}),
    boolean: helpers.boolean({$required: true}),
  });

  json = sch.getJsonSchema('create');

  expect(json.properties.string).toMatchObject({type: 'string'});
  expect(json.properties.integer).toMatchObject({type: 'integer'});
  expect(json.properties.number).toMatchObject({type: 'number'});
  expect(json.properties.dateTime).toMatchObject({type: 'string'});
  expect(json.properties.boolean).toMatchObject({type: 'boolean'});
});

test('filterView', () => {
  const sch = new ResourceSchema('test', {
    string: helpers.string({$required: true}),
    integer: helpers.integer({$required: true}),
    reverse: helpers.string({
      $required: true,
      $view: (value: unknown) => `${value}`.toUpperCase(),
    }),
    secret: helpers.string({$required: true, $view: false}),
    restricted: helpers.string({
      $required: true,
      $view: 'view.real.restricted',
    }),
  });

  sch.permissionName = 'real';

  const data = {
    string: 'public',
    integer: 9,
    reverse: 'abcd',
    secret: 'nobody-see-me',
    restricted: 'only-allowed',
  };

  const result1 = sch.viewAs(data, {
    permissions: ['view.real', 'view.real.restricted'],
  });

  expect(result1).toMatchObject({
    string: 'public',
    integer: 9,
    reverse: 'ABCD',
    restricted: 'only-allowed',
  });

  expect(result1).not.toHaveProperty(['secret']);

  const result2 = sch.viewAs(data, {
    permissions: ['view.real'],
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
    upperCase: helpers.string({}),
    virtual: helpers.string({
      $virtual: true,
    }),
    restricted: helpers.string({
      $create: false,
      $patch: 'patch.test.god',
    }),
  });

  sch.beforePatch = (data, {raw}) => {
    return {
      ...data,
      upperCase: `${data['upperCase']}`.toUpperCase(),
      restricted: `${data['upperCase']}`.toUpperCase(),
      hashed: `hashed[${raw['virtual']}]`,
    };
  };

  const data = {
    string: 'public',
    upperCase: 'abcd',
    virtual: 'VirTualz',
  };

  const result1 = await sch.validate('patch', data, {
    permissions: ['patch.test'],
  });

  expect(result1).toMatchObject({
    string: 'public',
    upperCase: 'ABCD',
    hashed: 'hashed[VirTualz]',
  });

  expect(result1).not.toHaveProperty(['virtual']);

  await sch
    .validate('create', data, {
      permissions: ['patch.test'],
    })
    .then(v => {
      expect(v).toBe('Error!');
    })
    .catch(e => {
      expect(e).toMatchObject({message: 'Permission denied'});
    });

  await sch
    .validate(
      'patch',
      {...data, restricted: 'hacked'},
      {
        permissions: ['patch.test'],
      }
    )
    .then(v => {
      expect(v).toBe('Error!');
    })
    .catch(e => {
      expect(e).toMatchObject({
        message: 'Permission denied to patch "restricted".',
      });
    });

  await sch
    .validate(
      'patch',
      {...data, restricted: 'hacked'},
      {
        permissions: ['patch.test', 'patch.test.god'],
      }
    )
    .catch(e => {
      expect(e).toMatchObject({
        message: 'Should not error',
      });
    });
});
