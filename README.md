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

- [`AsyncQueue`](#asyncqueue)
    - [Acknowledgements](#acknowledgements)
    - [Blocking vs non-blocking acknowledgements](#blocking-vs-non-blocking-acknowledgements)
- [`WorkPool`](#workpool)
- [`Executor`](#executor)
- [`Lock`](#lock)
- [`Blocker`](#blocker)
- [`PubSub`](#pubsub)
- [`repeatUntil`](#repeatuntil)
- [`waitFor`](#waitfor)
- [`sleep`](#sleep)
- [`raceTimeout`](#racetimeout)

# `AsyncQueue`

Asynchronous queue decouples value providers and value consumers.

```ts
const queue = new AsyncQueue();

// Provider adds a value
queue.add('Mars');

// Consumer takes a value
queue.take();
// ⮕ Promise { 'Mars' }
```

`add` appends the value to the queue, while `take` removes the value from the queue as soon as it is available. If there
are no values in the queue upon `take` call then the returned promise is resolved after the next `add` call.

```ts
const queue = new AsyncQueue();

// The returned promise would be resolved after the add call
queue.take();
// ⮕ Promise { 'Mars' }

queue.add('Mars');
```

Consumers receive values from the queue in the same order they were added by providers:

```ts
const queue = new AsyncQueue();

queue.add('Mars');
queue.add('Venus');

queue.take();
// ⮕ Promise { 'Mars' }

queue.take();
// ⮕ Promise { 'Venus' }
```

## Acknowledgements

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

`takeAck` returns a tuple of the available value and the acknowledgement callback. The consumer should call `ack` to
notify the queue on weather to remove the value from the queue or to retain it.

To acknowledge that the consumer can process the value, and the value must be removed from the queue use:

```ts
ack();
// or ack(true)
```

To acknowledge that the value should be retained by the queue use:

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

queue.take();
// ⮕ Promise { 'Pluto' }
```

## Blocking vs non-blocking acknowledgements

If you didn't call `ack`, the acknowledgement would be automatically revoked on _the next tick_ after the promise
returned by `takeAck` is resolved, and the value would remain in the queue.

If acknowledgement was revoked, the `ack` call would throw an error:

```ts
queue.takeAck()
  .then(protocol => protocol) // Add an extra tick
  .then(([value, ack]) => {
    ack();
    // ❌ Error: AsyncQueue acknowledgement was revoked
  });
```

To prevent the acknowledgement from being revoked, request a blocking acknowledgement:

```ts
queue.takeBlockingAck()
  .then(protocol => protocol) // Add an extra tick
  .then(([value, ack]) => {
    ack(); // Value successfully acknowledged
    doSomething(value);
  });
```

Blocking acknowledgement should be used if the consumer has to perform asynchronous actions _before_ processing the
value.

To guarantee that consumers receive values in the same order as they were provided, blocking acknowledgements prevent
subsequent consumers from being resolved until `ack` is called. Be sure to call `ack` to prevent the queue from being
stuck indefinitely.

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

The `execute` method returns a promise that is fulfilled when the promise returned from the callback is settled. If
there's a pending execution, it is aborted and the new execution is started.

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

You can check that the lock is [locked](https://smikhalevski.github.io/parallel-universe/classes/Lock.html#isLocked)
before acquiring a lock.

For example, if you want to force an async callback executions to be sequential you can use an external lock:

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

# `PubSub`

Publish–subscribe pattern implementation:

```ts
const pubSub = new PubSub<string>();

pubSub.subscribe(message => {
  // Process the message
});

pubSub.publish('Pluto');
```

# `repeatUntil`

Invokes a callback multiple times until the condition is met.

```ts
repeatUntil(
  // The callback that is invoked repeatedly
  async () => doSomething(),

  // The condition clause must return a truthy value to stop
  // the loop
  result => result.isFulfilled,

  // An optional callback that returns a delay in milliseconds
  // between iterations
  result => 100,
);
// ⮕ Promise<ReturnType<typeof doSomething>>
```

You can combine `repeatUntil` with [`raceTimeout`](#racetimeout) to limit the repeat duration:

```ts
raceTimeout(
  signal =>
    repeatUntil(
      () => doSomething(),
      result => signal.aborted || result.isFulfilled,
      100
    ),
  5000
);
// ⮕ Promise<ReturnType<typeof doSomething>>
```

# `waitFor`

Returns a promise that is fulfilled when a callback returns a truthy value:

```ts
waitFor(async () => doSomething());
// ⮕ Promise<ReturnType<typeof doSomething>>
```

If you don't want `waitFor` to invoke the callback too frequently, provide a delay in milliseconds:

```ts
waitFor(doSomething, 1_000);
```

# `sleep`

Returns a promise that resolves after a timeout. If signal is aborted then the returned promise is rejected with an
error.

```ts
sleep(100, abortController.signal);
// ⮕ Promise<void>
```

# `raceTimeout`

Rejects with an error if the execution time exceeds the timeout.

```ts
raceTimeout(async signal => doSomething(), 100);
// ⮕ Promise<ReturnType<typeof doSomething>>

raceTimeout(
  new Promise(resolve => {
    // Resolve the promise value
  }),
  100
);
```
