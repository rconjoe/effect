import type { Effect } from "../../../Effect"
import type { Histogram } from "../definition"

/**
 * @tsplus getter ets/Histogram apply
 */
export function apply<A>(self: Histogram<A>, __tsplusTrace?: string) {
  return <R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> =>
    self.appliedAspect(effect)
}