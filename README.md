# parallel-universe 🔭

Various promise utils.

```sh
npm install --save-prod parallel-universe
```

📚 [API documentation is available here.](https://smikhalevski.github.io/parallel-universe/)

# Usage

### `repeat`

```ts
repeat(
    // The callback that is invoked repeatedly
    async (signal) => doSometging(),

    // The until clause, that returns true to abort the loop
    (result, reason, callCount) => callCount > 3,

    // Optional delay between callback invokations
    10,

    // Optional signal that can abort the loop from the outside
    signal,
);
```
