import {callOrGet, identity} from './utils';

export function mute<P>(promise: Promise<P>): Promise<P | undefined>;

export function mute<P, Q>(promise: Promise<P>, rejectedValue: (() => Q) | Q): Promise<P | Q>;

export function mute<P>(promise: PromiseLike<P>): PromiseLike<P | undefined>;

export function mute<P, Q>(promise: PromiseLike<P>, rejectedValue: (() => Q) | Q): PromiseLike<P | Q>;

export function mute(promise: PromiseLike<unknown>, rejectedValue?: unknown): PromiseLike<unknown> {
  return promise.then(identity, () => callOrGet(rejectedValue));
}
