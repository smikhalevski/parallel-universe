import {AbortController, AbortSignal} from 'node-abort-controller';

global.AbortController = AbortController;
global.AbortSignal = AbortSignal;
