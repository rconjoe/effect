import type { Effect } from "../definition"

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @tsplus fluent ets/Effect timedWith
 */
export function timedWith_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  msTime: Effect<R2, E2, number>,
  __tsplusTrace?: string
) {
  return self.summarized(msTime, (start, end) => end - start)
}

/**
 * A more powerful variation of `timed` that allows specifying the clock.
 *
 * @ets_data_first timedWith_
 */
export function timedWith<R2, E2>(
  msTime: Effect<R2, E2, number>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>) => self.timedWith(msTime)
}