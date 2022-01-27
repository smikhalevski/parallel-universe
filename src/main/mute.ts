import {callOrGet, identity} from './utils';

export function mute<P>(p: Promise<P>): Promise<P | undefined>;

export function mute<P, Q>(p: Promise<P>, rejectedValue: (() => Q) | Q): Promise<P | Q>;

export function mute<P>(p: PromiseLike<P>): PromiseLike<P | undefined>;

export function mute<P, Q>(p: PromiseLike<P>, rejectedValue: (() => Q) | Q): PromiseLike<P | Q>;

export function mute(p: PromiseLike<unknown>, rejectedValue?: unknown): PromiseLike<unknown> {
  return p.then(identity, () => callOrGet(rejectedValue));
}
