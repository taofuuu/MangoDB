/*
 * A stand-in for the Prisma client. Any `db.<model>.<method>` is a jest.fn,
 * made the first time it is read, so a test only sets up the calls it cares
 * about. A call nobody set up returns undefined, which reads as "no row".
 *
 * $transaction runs a callback with this same client, or awaits an array,
 * the way Prisma does. resetDb() throws every fn away between tests.
 */
import { jest } from '@jest/globals';
import type { PrismaClient } from '../../src/generated/prisma/client';

// Each Prisma method has its own signature. Tests set return values per call
// and read the arguments back, so one loose function type is the honest one.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MockFn = jest.Mock<(...args: any[]) => any>;

// The model methods the API calls. Named, so a typo in a test is a type error.
type Method =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findFirst'
    | 'findMany'
    | 'create'
    | 'createMany'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'count'
    | 'groupBy';
export type ModelMock = Record<Method, MockFn>;

// Every model on the real client: db.company, db.listing, ...
type Model = Exclude<keyof PrismaClient, `$${string}` | symbol>;

let models = new Map<string, ModelMock>();
let rootFns = new Map<string, MockFn>();

function modelMock(name: string): ModelMock {
    let model = models.get(name);
    if (!model) {
        const fns = new Map<string, MockFn>();
        model = new Proxy({} as ModelMock, {
            get(_target, method) {
                if (typeof method !== 'string') return undefined;
                let fn = fns.get(method);
                if (!fn) {
                    fn = jest.fn() as MockFn;
                    fns.set(method, fn);
                }
                return fn;
            },
        });
        models.set(name, model);
    }
    return model;
}

function rootFn(name: string): MockFn {
    let fn = rootFns.get(name);
    if (!fn) {
        fn =
            name === '$transaction'
                ? (jest.fn(async (arg: unknown) =>
                      typeof arg === 'function'
                          ? (arg as (tx: unknown) => unknown)(db)
                          : Promise.all(arg as unknown[]),
                  ) as MockFn)
                : (jest.fn() as MockFn);
        rootFns.set(name, fn);
    }
    return fn;
}

type Db = Record<Model, ModelMock> &
    Record<'$transaction' | '$queryRaw', MockFn>;

export const db: Db = new Proxy({} as Db, {
    get(_target, key) {
        // `await db` must not look like a promise.
        if (typeof key !== 'string' || key === 'then') return undefined;
        return key.startsWith('$') ? rootFn(key) : modelMock(key);
    },
});

export function resetDb(): void {
    models = new Map();
    rootFns = new Map();
}
