import FilterParser from './parser';

test('simple filter', () => {
  const f = FilterParser('test', {
    filters: JSON.stringify([{field: 'test', operator: 'eq', value: 'simple'}]),
    sort: JSON.stringify({field: 'id', order: 'desc'}),
    pagination: JSON.stringify({current: 2, pageSize: 30}),
  });

  expect(f.filter).toMatchObject([{field: 'test', op: '=', value: 'simple'}]);
  expect(f.sort[0]).toMatchObject({field: 'id', direction: 'DESC'});
  expect(f.range).toMatchObject({offset: 30, limit: 30});
});

test('range filter', () => {
  const f = FilterParser('test', {
    filters: JSON.stringify([
      {field: 'test', operator: 'gt', value: 100},
      {field: 'test2', operator: 'contains', value: 'test'},
      {field: 'count', operator: 'between', value: [100, 1000]},
      {field: 'id', operator: 'in', value: [1, 2, 3, 4, 5]},
    ]),
    sort: JSON.stringify({field: 'id', order: 'desc'}),
    pagination: JSON.stringify({current: 2, pageSize: 30}),
  });

  expect(f.filter[0]).toMatchObject({field: 'test', op: '>', value: 100});
  expect(f.filter[1]).toMatchObject({
    field: 'test2',
    op: 'contains',
    value: 'test',
  });
  expect(f.filter[2]).toMatchObject({field: 'count', op: '>=', value: 100});
  expect(f.filter[3]).toMatchObject({field: 'count', op: '<=', value: 1000});

  expect(f.filter[4]).toMatchObject({
    field: 'id',
    op: 'in',
    value: [1, 2, 3, 4, 5],
  });

  // expect(f.filter).toMatchObject([{field: 'test', op: '=', value: 'simple'}]);
  expect(f.sort[0]).toMatchObject({field: 'id', direction: 'DESC'});
  expect(f.range).toMatchObject({offset: 30, limit: 30});
});
