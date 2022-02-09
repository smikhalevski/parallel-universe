# parallel-universe [![build](https://github.com/smikhalevski/parallel-universe/actions/workflows/master.yml/badge.svg?branch=master&event=push)](https://github.com/smikhalevski/parallel-universe/actions/workflows/master.yml)

<a href="#readme">
  <img alt="Spaceman" src="https://github.com/smikhalevski/parallel-universe/raw/next/spaceman.png"/>
</a>

The set of async flow control structures and promise utils.

```sh
npm install --save-prod parallel-universe
```

🚀 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

- [`AsyncQueue`](#asyncqueue)
- [`Pool`](#pool)
- [`Blocker`](#blocker)
- [`Lock`](#lock)
- [`Executor`](#executor)
- [`repeatUntil`](#repeatuntil)
- [`sleep`](#sleep)
- [`timeout`](#timeout)

# Usage

### `AsyncQueue`

Asynchronous queue that decouples value providers and consumers.

```ts
const queue = new AsyncQueue();

queue.take(); // → Promise<"my value">

queue.add('my value');
```

`take` dequeues value from the queue. If value consumer may not be able to process the value when it was taken, you
should use `takeAck`.

`takeAck` returns a `Promise` that resolves with an acknowledgement callback that returns a value. The
acknowledgement callback dequeues a value and returns it; all subsequent invocations of the acknowledgement callback
would return the same value.

```ts
queue.takeAck().then((ack) => {
  const value = ack();
});
```

The acknowledgement callback must be either ignored or called on _the next tick_ after the returned `Promise` is
resolved, otherwise it is revoked and would throw an error.

```ts
queue.takeAck()
    .then(() => undefined) // Skip the tick
    .then((ack) => {
      ack(); // → throws an Error
    });
```

### `Pool`

The callback execution pool that can execute limited number of callbacks in parallel while other submitted callbacks
wait in the queue.

```ts
// Pool that proceesses 5 callbacks in parallel at maximum
const pool = new Pool(5);

pool.submit(async () => doSomething());
// → Promise<ReturnType<typeof doSomething>>

// Change how many callback can the pool process in parallel
pool.resize(2);
// → Promise<void>
```

If you resize the pool down, some callbacks that are pending may be aborted via `signal.aborted`.
`Pool.resize` returns the `Promise` that is resolved when there are no excessive are being processed in parallel.

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

Promise-based [lock implementation](https://en.wikipedia.org/wiki/Lock_(computer_science)).

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
