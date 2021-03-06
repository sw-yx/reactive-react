import Observable from 'zen-observable'
import {fromEvent, scan, merge, startWith, switchLatest} from './swyxjs'
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
import createElement from 'virtual-dom/create-element';
import { createChangeEmitter } from 'change-emitter'
import { renderStream } from './reconciler'

export const stateMapPointer = new Map()

const circuitBreakerflag = !true // set true to enable debugger in infinite loops
let circuitBreaker = -200

const emitter = createChangeEmitter()
// single UI thread; this is the observable that sticks around and swaps out source
const UIthread = new Observable(observer => {
  emitter.listen(x => {
    observer.next(x)
  })
})
// mount the vdom on to the dom and 
// set up the runtime from sources and
// patch the vdom
// ---
// returns an unsubscribe method you can use to unmount
export function mount(rootElement, container) {
  // initial, throwaway-ish frame
  let {source, instance} = renderStream(rootElement, {}, undefined, stateMapPointer)
  let instancePointer = instance
  const rootNode = createElement(instance.dom)
  const containerChild = container.firstElementChild
  if (containerChild) {
    container.replaceChild(rootNode,containerChild) // hot reloaded mount
  } else {
    container.appendChild(rootNode) // initial mount
  }
  let currentSrc$ = null
  let SoS = startWith(UIthread, source) // stream of streams
  return SoS.subscribe(
    src$ => { // this is the current sourceStream we are working with
      if (currentSrc$) console.log('unsub!') || currentSrc$.unsubscribe() // unsub from old stream
      if (circuitBreakerflag && circuitBreaker++ > 0) debugger
      /**** main */
      const source2$ = scan(
        src$, 
        ({instance, stateMap}, nextState) => {
          const streamOutput = renderStream(rootElement, instance, nextState, stateMap)
          if (streamOutput.isNewStream) { // quick check
            const nextSource$ = streamOutput.source
            instancePointer = streamOutput.instance
            patch(rootNode, diff(instance.dom, instancePointer.dom)) // render to screen
            emitter.emit(nextSource$) // update the UI thread; source will switch
          } else {
            const nextinstance = streamOutput.instance
            patch(rootNode, diff(instance.dom, nextinstance.dom)) // render to screen
            return {instance: nextinstance, stateMap: stateMap}
          }
        },
        {instance: instancePointer, stateMap: stateMapPointer} // accumulator
      )
      /**** end main */
      currentSrc$ = 
        source2$
          .subscribe()
    }
  )
}
