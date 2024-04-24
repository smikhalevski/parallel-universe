<p align="center">
  <a href="#readme">
    <img alt="Spaceman" src="./spaceman.png"/>
  </a>
</p>

```sh
npm install --save-prod parallel-universe
```

🚀 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

- [`AbortablePromise`](#abortablepromise)
- [`Deferred`](#deferred)
- [`AsyncQueue`](#asyncqueue)
- [`WorkPool`](#workpool)
- [`Lock`](#lock)
- [`Blocker`](#blocker)
- [`PubSub`](#pubsub)
- [`repeat`](#repeat)
- [`waitFor`](#waitfor)
- [`delay`](#delay)
- [`timeout`](#timeout)

# `AbortablePromise`

The promise that can be aborted.

```ts
const promise = new AbortablePromise((resolve, reject, signal) => {
  signal.addEventListener('abort', () => {
    // Listen to the signal being aborted
  });
  
  // Resolve or reject the promise
});

promises.abort();
```

When [`abort`](https://smikhalevski.github.io/parallel-universe/classes/AbortablePromise.html#abort) is called,
the promise is instantly rejected with
an [`AbortError`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException#aborterror) if it isn't settled yet.

Provide a custom abort reason:

```ts
promise.abort(new Error('Operation aborted'));
```

Abort promise if an external signal is aborted:

```ts
promise.withSignal(signal);
```

# `Deferred`

The promise that can be resolved externally.

```ts
const promise = new Deferred<string>();

promise.then(value => {
  doSomething(value);
});

promises.resolve('Mars');
```

# `AsyncQueue`

Asynchronous queue decouples value providers and value consumers.

```ts
const queue = new AsyncQueue();

// Provider adds a value
queue.append('Mars');

// Consumer takes a value
queue.take();
// ⮕ AbortablePromise { 'Mars' }
```

`append` appends the value to the queue, while `take` removes the value from the queue as soon as it is available.
If there are no values in the queue upon `take` call then the returned promise is resolved after the next `append` call.

```ts
const queue = new AsyncQueue();

// The returned promise would be resolved after the append call
queue.take();
// ⮕ AbortablePromise { 'Mars' }

queue.append('Mars');
```

Consumers receive values from the queue in the same order they were added by providers:

```ts
const queue = new AsyncQueue();

queue.append('Mars');
queue.append('Venus');

queue.take();
// ⮕ AbortablePromise { 'Mars' }

queue.take();
// ⮕ AbortablePromise { 'Venus' }
```

## Acknowledgements

In some cases removing the value from the queue isn't the desirable behavior, since the consumer may not be able to
process the taken value. Use `takeAck` to examine available value and acknowledge that it can be processed. `takeAck`
returns a tuple of the available value and the acknowledgement callback. The consumer should call `ack` to notify
the queue on weather to remove the value from the queue or to retain it.

```ts
queue.takeAck().then(([value, ack]) => {
  try {
    if (doSomeChecks()) {
      ack(true);
      doSomething(value);
    } 
  } finally {
    ack(false);
  }
});
```

To guarantee that consumers receive values in the same order as they were provided, acknowledgements prevent subsequent
consumers from being fulfilled until `ack` is called. Be sure to call `ack` to prevent the queue from being stuck
indefinitely.

Calling `ack` multiple times is safe, since only the first call would have an effect.

To acknowledge that the consumer can process the value, and the value must be removed from the queue use:

```ts
ack(true);
```

To acknowledge that the value should be retained by the queue use:

```ts
ack(false);
```

The value that was retained in the queue becomes available for the subsequent consumer.

```ts
const queue = new AsyncQueue();

queue.append('Pluto');

queue.takeAck(([value, ack]) => {
  ack(false); // Tells queue to retain the value
});

queue.take();
// ⮕ AbortablePromise { 'Pluto' }
```

# `WorkPool`

The callback execution pool that executes the limited number of callbacks in parallel while other submitted callbacks
wait in the queue.

```ts
// The pool that processes 5 callbacks in parallel at maximum
const pool = new WorkPool(5);

pool.submit(signal => {
  return Promise.resolve('Mars');
});
// ⮕ AbortablePromise<string>
```

You can change how many callbacks can the pool process in parallel:

```ts
pool.setSize(2);
// ⮕ Promise<void>
```

`setSize` returns the promise that is resolved when there are no excessive callbacks being processed in parallel.

If you resize the pool down, callbacks that are pending and exceed the new size limit, are notified via `signal` that
they must be aborted.

To abort all callbacks that are being processed by the pool and wait for their completion use:

```ts
// Resolved when all pending callbacks are fulfilled
pool.setSize(0);
// ⮕ Promise<void>
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

# `repeat`

Invokes a callback periodically with the given delay between settlements of returned promises until the condition is
met. By default, the callback is invoked indefinitely with no delay between settlements: 

```ts
repeat(async () => {
  await doSomething();
});
// ⮕ AbortablePromise<void>
```

Specify a delay between invocations:

```ts
repeat(doSomething, 3000);
// ⮕ AbortablePromise<void>
```

Abort the loop:

```ts
const promise = repeat(doSomething, 3000);

promise.abort();
```

Specify the condition when the loop must be stopped. The example below randomly picks a planet name once every 3 seconds
and fulfills the returned promise when `'Mars'` is picked: 

```ts
repeat(
  () => ['Mars', 'Pluto', 'Venus'][Math.floor(Math.random() * 3)],
  3000,
  value => value === 'Mars'
);
// ⮕ AbortablePromise<string>
```

You can combine `repeat` with [`timeout`](#timeout) to limit the repeat duration:

```ts
timeout(
  repeat(async () => {
    await doSomething();
  }),
  5000
);
```

# `retry`

Invokes a callback periodically until it successfully returns the result. If a callback throws an error or returns
a promise that is rejected then it is invoked again after a delay. 

```ts
retry(async () => {
  await doSomethingOrThrow();
});
// ⮕ AbortablePromise<void>
```

Specify a delay between tries:

```ts
retry(doSomethingOrThrow, 3000);
// ⮕ AbortablePromise<void>
```

Specify maximum number of tries:

```ts
retry(doSomethingOrThrow, 3000, 5);
// ⮕ AbortablePromise<void>
```

Abort the retry prematurely:

```ts
const promise = retry(doSomethingOrThrow, 3000);

promise.abort();
```

You can combine `retry` with [`timeout`](#timeout) to limit the retry duration:

```ts
timeout(
  retry(async () => {
    await doSomethingOrThrow();
  }),
  5000
);
```

# `waitFor`

Returns a promise that is fulfilled when a callback returns a truthy value:

```ts
waitFor(async () => doSomething());
// ⮕ AbortablePromise<ReturnType<typeof doSomething>>
```

If you don't want `waitFor` to invoke the callback too frequently, provide a delay in milliseconds:

```ts
waitFor(doSomething, 1_000);
```

# `delay`

Returns a promise that resolves after a timeout. If signal is aborted then the returned promise is rejected with an
error.

```ts
delay(100);
// ⮕ AbortablePromise<void>
```

Delay can be resolved with a value:

```ts
delay(100, 'Pluto');
// ⮕ AbortablePromise<string>
```

# `timeout`

Rejects with an error if the execution time exceeds the timeout.

```ts
timeout(async signal => doSomething(), 100);
// ⮕ Promise<ReturnType<typeof doSomething>>

timeout(
  new AbortablePromise(resolve => {
    // Resolve the promise value
  }),
  100
);
```
