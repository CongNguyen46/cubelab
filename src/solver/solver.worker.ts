/// <reference lib="webworker" />
// Runs the two-phase solver off the main thread (NFR-3).
import { handleRequest, type SolverRequest } from './core.ts'

self.onmessage = (e: MessageEvent<SolverRequest>) => {
  self.postMessage(handleRequest(e.data))
}
