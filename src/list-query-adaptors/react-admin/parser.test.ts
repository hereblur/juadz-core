import FilterParser from './parser';

test('simple filter', () => {
  const f = FilterParser('test', {
    filter: JSON.stringify({test: 'simple'}),
    sort: JSON.stringify(['id', 'DESC']),
    range: JSON.stringify([9, 100]),
  });

  expect(f.filter).toMatchObject([{field: 'test', op: '=', value: 'simple'}]);
  expect(f.sort[0]).toMatchObject({field: 'id', direction: 'DESC'});
  expect(f.range).toMatchObject({offset: 9, limit: 100});
});

test('range filter', () => {
  const f = FilterParser('test', {
    filter: JSON.stringify({
      test: {min: 1, max: 10},
      test2: {after: 1, before: 10},
      id: [1, 2, 3, 4, 5],
    }),
    sort: JSON.stringify(['id', 'DESC']),
    range: JSON.stringify([9, 100]),
  });

  expect(f.filter[0]).toMatchObject({field: 'test', op: '>=', value: 1});
  expect(f.filter[1]).toMatchObject({field: 'test', op: '<=', value: 10});
  expect(f.filter[2]).toMatchObject({field: 'test2', op: '>', value: 1});
  expect(f.filter[3]).toMatchObject({field: 'test2', op: '<', value: 10});

  expect(f.filter[4]).toMatchObject({
    field: 'id',
    op: 'in',
    value: [1, 2, 3, 4, 5],
  });
  expect(f.sort[0]).toMatchObject({field: 'id', direction: 'DESC'});
  expect(f.range).toMatchObject({offset: 9, limit: 100});
});
