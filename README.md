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
- [`WorkPool`](#workpool)
- [`Blocker`](#blocker)
- [`Lock`](#lock)
- [`Executor`](#executor)
- [`repeatUntil`](#repeatuntil)
- [`sleep`](#sleep)
- [`timeout`](#timeout)

# Usage

## `AsyncQueue`

Asynchronous queue decouples value providers and value consumers.

```ts
const queue = new AsyncQueue();

// Provider adds a value
queue.add('Mars');

// Consumer takes a value
queue.take(); // → Promise<"Mars">
```

`add` appends the value to the queue, while `take` removes the value from the queue as soon as it is available. If there
are no values in the queue upon `take` call then the returned `Promise` is resolved after the next `add` call.

```ts
const queue = new AsyncQueue();

// The returned Promise would be resolved after the add call
queue.take(); // → Promise<"Mars">

queue.add("Mars");
```

Consumers receive values from the queue in the same order they were added by providers:

```ts
const queue = new AsyncQueue();

queue.add('Mars');
queue.add('Venus');

queue.take(); // → Promise<"Mars">
queue.take(); // → Promise<"Venus">
```

### Acknowledgements

In some cases removing the value from the queue isn't the desirable behavior, since the consumer may not be able to
process the taken value. Use `takeAck` to examine available value and acknowledge that it can be processed.

```ts
queue.takeAck().then(([value, ack]) => {
  if (doSomeChecks()) {
    ack();
    doSomething(value);
  }
});
```

`takeAck` returns an [`AckProtocol`](https://smikhalevski.github.io/parallel-universe/modules.html#AckProtocol), a tuple
of the available value and the acknowledgement callback. The consumer should call `ack` to notify the queue on weather
to remove the value from the queue or to retain it.

Acknowledge that the consumer can process the value, and the value must be removed from the queue:

```ts
ack(); // or ack(true)
```

Acknowledge that the value should be retained by the queue:

```ts
ack(false);
```

The value that was retained in the queue becomes available for the subsequent consumer.

```ts
const queue = new AsyncQueue();

queue.add('Pluto');

queue.takeAck(([value, ack]) => {
  ack(false); // Tells queue to retain the value
});

queue.take(); // → Promise<"Pluto">
```

### Blocking vs non-blocking acknowledgements

By default, if you didn't call `ack`, the acknowledgement would be automatically revoked on _the next tick_ after
the `Promise` returned by `takeAck` is resolved, and the value would remain in the queue.

If acknowledgement was revoked, the `ack` call would throw an error:

```ts
queue.takeAck()
    .then((protocol) => protocol) // Extra tick
    .then(([value, ack]) => {
      ack(); // → throws an Error 
    });
```

To prevent the acknowledgement from being revoked, request a blocking acknowledgement:

```ts
queue.takeAck(true) // Request blocking ack
    .then((protocol) => protocol) // Extra tick
    .then(([value, ack]) => {
      ack(); // Works just fine!
      doSomething(value);
    });
```

Blocking acknowledgement are required if the consumer has to perform asynchronous actions before processing the value.

To guarantee that consumers receive values in the same order as they were provided, blocking acknowledgements prevent
subsequent consumers from being resolved until `ack` is called. So be sure to call `ack` for blocking acknowledgements
to prevent the queue from being stuck indefinitely.

```ts
async function blockingConsumer() {
  const [value, ack] = queue.takeAck(true);
  try {
    if (await doSomeChecks()) {
      ack(true);
      doSomething(value);
    }
  } finally {
    // It's safe to call ack multiple times since it's a no-op
    ack(false);
  }
}
```

## `WorkPool`

The callback execution pool that can execute limited number of callbacks in parallel while other submitted callbacks
wait in the queue.

```ts
// The pool that proceesses 5 callbacks in parallel at maximum
const pool = new WorkPool(5);

pool.submit(async (signal) => doSomething());
// → Promise<ReturnType<typeof doSomething>>
```

You can change how many callbacks can the pool process in parallel:

```ts
pool.resize(2); // → Promise<void>
```

`resize` returns the `Promise` that is resolved when there are no excessive callbacks being processed in parallel.

If you resize the pool down, callbacks that are pending and exceed the new size limit, are notified via `signal` that
they must be aborted.

To abort all callbacks that are being processed by the pool and wait for their completion use:

```ts
// Resolved when all pending callbacks are fulfilled
pool.resize(0); // → Promise<void>
```

## `Blocker`

Provides mechanism for blocking async processes and unblocking them from an external context.

```ts
const blocker = new Blocker();

async function doSomething() {
  const value = await blocker.block();
  // → "Mars"
}

doSomething();

blocker.unblock('Mars');
```

## `Lock`

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

## `Executor`

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

## `repeatUntil`

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

## `sleep`

Returns a promise that resolves after a timeout. If aborted via a passed signal then rejected with an `AbortError`.

```ts
sleep(100, abortController.signal);
// → Promise<undefined>
```

## `timeout`

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
