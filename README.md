<p align="center">
  <a href="#readme">
    <img alt="Spaceman" src="./spaceman.png"/>
  </a>
</p>

The set of async flow control structures and promise utils.

```sh
npm install --save-prod parallel-universe
```

🚀 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

- [`PubSub`](#pubsub)
- [`Topic`](#asynctopic)
    - [Acknowledgements](#acknowledgements)
    - [Blocking vs non-blocking acknowledgements](#blocking-vs-non-blocking-acknowledgements)
- [`WorkPool`](#workpool)
- [`Executor`](#executor)
- [`Lock`](#lock)
- [`Blocker`](#blocker)
- [`untilTruthy`](#untiltruthy)
- [`repeatUntil`](#repeatuntil)
- [`sleep`](#sleep)
- [`raceTimeout`](#racetimeout)

# `PubSub`

Publish–subscribe pattern implementation that guarantees that published messages are delivered even if some listeners
throw an error.

```ts
const pubSub = new PubSub<string>();

pubSub.subscribe(message => {
  message === 'Pluto' // ⮕ true
});

pubSub.publish('Pluto');
```

If listener throws an error, it is passed to an error handler callback:

```ts
const pubSub = new PubSub<string>(error => {
  console.log(error);
});

pubSub.subscribe(() => {
  throw new Error('Kaput');
});

pubSub.publish('Mars');
// Prints 'Error: Kaput' to the console
```

By default, error handler is set to `PubSub.defaultErrorHandler` which logs errors to the console.

# `Topic`

Asynchronous topic decouples value providers and value consumers.

```ts
const topic = new Topic();

// Provider adds a value
topic.add('Mars');

// Consumer takes a value
topic.take();
// ⮕ Promise<'Mars'>
```

`add` appends the value to the topic, while `take` removes the value from the topic as soon as it is available. If there
are no values in the topic upon `take` call then the returned promise is resolved after the next `add` call.

```ts
const topic = new Topic();

// The returned promise would be resolved after the add call
topic.take();
// ⮕ Promise<'Mars'>

topic.add('Mars');
```

Consumers receive values from the topic in the same order they were added by providers:

```ts
const topic = new Topic();

topic.add('Mars');
topic.add('Venus');

topic.take();
// ⮕ Promise<'Mars'>

topic.take();
// ⮕ Promise<'Venus'>
```

## Acknowledgements

In some cases removing the value from the topic isn't the desirable behavior, since the consumer may not be able to
process the taken value. Use `takeAck` to examine available value and acknowledge that it can be processed.

```ts
topic.takeAck().then(([value, ack]) => {
  if (doSomeChecks()) {
    ack();
    doSomething(value);
  }
});
```

`takeAck` returns a tuple of the available value and the acknowledgement callback. The consumer should call `ack` to
notify the topic on weather to remove the value from the topic or to retain it.

To acknowledge that the consumer can process the value, and the value must be removed from the topic use:

```ts
ack();
// or ack(true)
```

To acknowledge that the value should be retained by the topic use:

```ts
ack(false);
```

The value that was retained in the topic becomes available for the subsequent consumer.

```ts
const topic = new Topic();

topic.add('Pluto');

topic.takeAck(([value, ack]) => {
  ack(false); // Tells topic to retain the value
});

topic.take();
// ⮕ Promise<'Pluto'>
```

## Blocking vs non-blocking acknowledgements

If you didn't call `ack`, the acknowledgement would be automatically revoked on _the next tick_ after the promise
returned by `takeAck` is resolved, and the value would remain in the topic.

If acknowledgement was revoked, the `ack` call would throw an error:

```ts
topic.takeAck()
  .then(protocol => protocol) // Add an extra tick
  .then(([value, ack]) => {
    ack();
    // ❌ Error: Topic acknowledgement was revoked
  });
```

To prevent the acknowledgement from being revoked, request a blocking acknowledgement:

```ts
topic.takeBlockingAck()
  .then(protocol => protocol) // Add an extra tick
  .then(([value, ack]) => {
    ack(); // Value successfully acknowledged
    doSomething(value);
  });
```

Blocking acknowledgement is required if the consumer has to perform asynchronous actions _before_ processing the value.

To guarantee that consumers receive values in the same order as they were provided, blocking acknowledgements prevent
subsequent consumers from being resolved until `ack` is called. Be sure to call `ack` to prevent the topic from being
stuck indefinitely.

```ts
async function blockingConsumer() {
  const [value, ack] = topic.takeAck(true);

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

# `WorkPool`

The callback execution pool that executes the limited number of callbacks in parallel while other submitted callbacks
wait in the queue.

```ts
// The pool that processes 5 callbacks in parallel at maximum
const pool = new WorkPool(5);

pool.submit(async signal => doSomething());
// ⮕ Promise<ReturnType<typeof doSomething>>
```

You can change how many callbacks can the pool process in parallel:

```ts
pool.resize(2);
// ⮕ Promise<void>
```

`resize` returns the promise that is resolved when there are no excessive callbacks being processed in parallel.

If you resize the pool down, callbacks that are pending and exceed the new size limit, are notified via `signal` that
they must be aborted.

To abort all callbacks that are being processed by the pool and wait for their completion use:

```ts
// Resolved when all pending callbacks are fulfilled
pool.resize(0);
// ⮕ Promise<void>
```

# `Executor`

Executor manages an async callback execution process and provides ways to access execution results, abort or replace an
execution, and subscribe to its state changes.

Create an `Executor` instance and submit a callback for execution:

```ts
const executor = new Executor();

executor.execute(doSomething);
// ⮕ Promise<void>
```

The `execute` method returns a promise that is fulfilled when the promise returned from the callback is settled.

If there's a pending execution, it is aborted and the new execution is started.

To check that executor is currently executing a callback check
[`pending`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#pending).

After a promise returned from the executed callback is settled, the execution result and rejection reason are available
via [`result`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#result) and
[`reason`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#reason).

You can check whether the promise was
[`fulfilled`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#fulfilled),
[`rejected`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#rejected) or
[`settled`](https://smikhalevski.github.io/parallel-universe/classes/Executor.html#settled).

To abort the pending execution, you can use
an [abort signal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)
passed to the executed callback:

```ts
executor.execute(async signal => {
  // Check signal.aborted
});

executor.abort();
```

When execution is aborted the current `result` and `reason` remain intact.

To reset the executor to the initial state use:

```ts
executor.clear();
```

You can directly fulfill or reject an executor:

```ts
executor.resolve(value);

executor.reject(reason);
```

Subscribe to an executor to receive notifications when its state changes:

```ts
const unsubscribe = executor.subscribe(() => {
  // Handle the update
});

unsubscribe();
```

# `Lock`

Promise-based [lock implementation](https://en.wikipedia.org/wiki/Lock_(computer_science)).

When someone tries to acquire a `Lock` they receive a promise for a release callback that is resolved as soon as
previous lock owner invokes their release callback.

```ts
const lock = new Lock();

lock.acquire();
// ⮕ Promise<() => void>
```

You can check that the lock is [`locked`](https://smikhalevski.github.io/parallel-universe/classes/Lock.html#locked)
before acquiring a lock.

For example, if you want to force an async callback executions to be sequential you can use ane external lock:

```ts
const lock = new Lock();

async function doSomething() {
  const release = await lock.acquire();
  try {
    // Long process is handled here
  } finally {
    release();
  }
}

// Long process would be executed three times sequentially
doSomething();
doSomething();
doSomething();
```

# `Blocker`

Provides a mechanism for blocking an async process and unblocking it from the outside.

```ts
const blocker = new Blocker<string>();

blocker.block();
// ⮕ Promise<string>
```

You can later unblock it passing a value that would fulfill the promise returned from the `block` call:

```ts
blocker.unblock('Mars');
```

# `untilTruthy`

Returns a promise that is fulfilled when a callback returns a truthy value, or a promise that is fulfilled with a
truthy value.

```ts
untilTruthy(async () => doSomething());
// ⮕ Promise<ReturnType<typeof doSomething>>
```

If you don't want `untilTruthy` to invoke the callback too frequently, provide a delay in milliseconds:

```ts
untilTruthy(doSomething, 1_000);
```

Instead of a fixed delay you can pass a function that returns a delay:

```ts
untilTruthy(
  doSomething,
  result => result.rejected ? 1_000 : 0
);
```

# `repeatUntil`

Much like a [`untilTruthy`](#untiltruthy) and provides more control when the callback polling is fulfilled.

```ts
repeatUntil(
  // The callback that is invoked repeatedly
  async () => doSomething(),

  // The until clause must return a truthy value to stop the loop
  result => result.fulfilled,

  // Optional delay between callback invokations
  result => 100,
  // or just pass a literal number of milliseconds
);
// ⮕ Promise<ReturnType<typeof doSomething>>
```

You can combine `repeatUntil` with [`raceTimeout`](#racetimeout) to limit the repeat duration:

```ts
raceTimeout(
  signal =>
    repeatUntil(
      () => doSomething(),
      result => signal.aborted || result.fulfilled,
      100
    ),
  5000
);
// ⮕ Promise<ReturnType<typeof doSomething>>
```

# `sleep`

Returns a promise that resolves after a timeout. If signal is aborted then the returned promise is rejected with an
`AbortError`.

```ts
sleep(100, abortController.signal);
// ⮕ Promise<void>
```

# `raceTimeout`

Rejects with an `Error` if execution time exceeds the timeout.

```ts
raceTimeout(async () => doSomething(), 100);
// ⮕ Promise<ReturnType<typeof doSomething>>
```
