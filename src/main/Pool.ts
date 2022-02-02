import {Awaitable} from './shared-types';
import {isPromiseLike} from './isPromiseLike';
import {Queue} from './Queue';

interface Submission {
  cb: () => Awaitable<any>;
  resolve: (result: any) => void;
  reject: (reason: any) => void;
}

export class Pool {

  private _size = 5;
  private _submissions = new Queue<Submission>();

  private _loop() {
    for (let i = 0; i < this._size; ++i) {

      const worker = () => {
        // if (terminated) {
        //   return;
        // }
        this._submissions.takeAck((ack) => {
          // if (terminated) {
          //   return;
          // }
          const {cb, reject, resolve} = ack()!;
          let result;
          try {
            result = cb();
          } catch (error) {
            reject(error);
            Promise.resolve().then(worker);
            return;
          }
          if (isPromiseLike(result)) {
            result.then(resolve, reject).then(worker);
          } else {
            resolve(result);
            Promise.resolve().then(worker);
          }
        });
      };

      worker();
    }
  }

  public submit<T>(cb: () => Awaitable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._submissions.add({cb, resolve, reject});
    });
  }
}
