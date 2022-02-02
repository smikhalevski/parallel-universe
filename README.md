# parallel-universe 🔭 [![build](https://github.com/smikhalevski/parallel-universe/actions/workflows/master.yml/badge.svg?branch=master&event=push)](https://github.com/smikhalevski/parallel-universe/actions/workflows/master.yml)

The set of async flow control structures and promise utils.

```sh
npm install --save-prod parallel-universe
```

📚 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

- [`Blocker`](#blocker)
- [`Lock`](#lock)
- [`Executor`](#executor)
- [`repeatUntil`](#repeatuntil)
- [`sleep`](#sleep)
- [`timeout`](#timeout)

# Usage

### `Blocker`

Provides mechanism for blocking async processes and unblocking them from an external context.

```ts
const blocker = new Blocker();

async function doSomething() {
  const value = await blocker.block();
  // → "my value"
}

doSomething();

blocker.unblock('my value');
```

### `Lock`

Promise-based lock implementation.

When someone tries to acquire a `Lock` they receive a `Promise` for a release callback that is resolved as soon as
previous lock owner invokes their release callback.

```ts
const lock = new Lock();

async function doSomething() {
  const release = await lock.acquire();
  try {
    // Long process starts here
  } finally {
    release();
  }
}

// Long process would be executed three times sequentially
doSomething();
doSomething();
doSomething();
```

### `Executor`

Manages async callback execution process and provides ways to access execution results, abort or replace an execution,
and subscribe to state changes.

```ts
const executor = new Executor();

executor.execute(async (signal) => doSomething());
// → Promise<void>

executor.pending;
// → true

// Aborts pending execution
executor.abort();
```

### `repeatUntil`

Invokes a callback periodically with the given delay between resolutions of the returned `Promise`.

```ts
repeatUntil(
    // The callback that is invoked repeatedly
    async (signal) => doSomething(),

    // The until clause must return true to stop the loop
    (asyncResult) => asyncResult.rejected,

    // Optional delay between callback invokations
    100,
    // or
    // (asyncResult) => 100,

    // Optional signal that can abort the loop from the outside
    abortController.signal,
);
// → Promise<ReturnType<typeof doSomething>>
```

### `sleep`

Returns a promise that resolves after a timeout. If aborted via a passed signal then rejected with an `AbortError`.

```ts
sleep(100, abortController.signal);
// → Promise<undefined>
```

### `timeout`

Rejects with a `TimeoutError` if execution time exceeds the timeout. If aborted via a passed signal then rejected with
an `AbortError`.

```ts
timeout(
    async (signal) => doSomething(),
    // or
    // doSomething()

    // Execution timeout
    100,

    // Optional signal that can abort the execution from the outside
    abortController.signal,
);
// → Promise<ReturnType<typeof doSomething>>
```
