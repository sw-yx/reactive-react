import Observable from 'zen-observable'
import { createChangeEmitter } from 'change-emitter'

export const TEXT_ELEMENT = "TEXT ELEMENT";

export function createElement(type, config, ...args) {
  const props = Object.assign({}, config);
  const hasChildren = args.length > 0;
  const rawChildren = hasChildren ? [].concat(...args) : [];
  props.children = rawChildren
    .filter(c => c != null && c !== false)
    .map(c => c instanceof Object ? c : createTextElement(c));
  return { type, props };
}

function createTextElement(value) {
  return createElement(TEXT_ELEMENT, { nodeValue: value });
}

export function createHandler(_fn) {
  const emitter = createChangeEmitter()
  let handler = emitter.emit
  handler.$ = new Observable(observer => {
    return emitter.listen(value => observer.next(_fn ? _fn(value) : value))
  })
  return handler
}