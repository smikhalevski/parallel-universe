# parallel-universe 🔭

Various promise utils.

```sh
npm install --save-prod parallel-universe
```

📚 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

# Usage

### `repeat`

Repeatedly invokes callback. If aborted via a passed signal then rejected with an `AbortError`.

```ts
repeat(
    // The callback that is invoked repeatedly
    async (signal) => doSometging(),

    // The until clause must return true to stop the loop
    (result, reason, rejected) => false,

    // Optional delay between callback invokations
    100,
    // or
    // (result, reason, rejected) => 100,

    // Optional signal that can abort the loop from the outside
    abortController.signal,
);
// → Promise<ReturnType<typeof doSometging>>
```

### `untilDefined`

Resolves with `value` if `value != null` or repeats the check.

```ts
untilDefined(
    async (signal) => value,
    100,
    abortController.signal,
)
```

### `sleep`

Returns a promise that resolves after a timeout. If aborted via a passed signal then rejected with an `AbortError`.

```ts
sleep(100, abortController.signal); // → Promise<undefined>
```

### `timeout`

Rejects with a `TimeoutError` if execution time exceeds the timeout. If aborted via a passed signal then rejected with
an `AbortError`.

```ts
timeout(
    async (signal) => doComething(),
    // or
    // doComething()

    // Execution timeout
    100,

    // Optional signal that can abort the execution from the outside
    abortController.signal,
);
// → Promise<ReturnType<typeof doSometging>>
```
