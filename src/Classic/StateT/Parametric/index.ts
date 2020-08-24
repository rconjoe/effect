import * as StateT from "../"
import type { StateInURI, StateOutURI } from "../../../Modules"
import type { Monad } from "../../../Prelude"
import * as HKT from "../../../Prelude/HKT"

/**
 * Take over ownership of "S" making it fixed to provided "S"
 */
export type V<C, S> = HKT.CleanParam<C, "S"> & HKT.Fix<"S", S>

/**
 * State Input URI with local override of "S", this makes it safe to be
 * stacked multiple times
 */
export interface PSIn<S> extends HKT.URI<StateInURI, HKT.Fix<"S", S>> {}

/**
 * State Output URI with local override of "S", this makes it safe to be
 * stacked multiple times
 */
export interface PSOut<S> extends HKT.URI<StateOutURI, HKT.Fix<"S", S>> {}

/**
 * Construct the transformed URI as [StateIn, F, StateOut]
 */
export type ParametricStateT<F extends HKT.URIS, S> = HKT.PrependURI<
  PSIn<S>,
  HKT.AppendURI<F, PSOut<S>>
>

export function monad<S>() {
  return <F extends HKT.URIS, C>(M: Monad<F, C>) => getMonad_<F, C, S>(M)
}

function getMonad_<F extends HKT.URIS, C, S>(
  M: Monad<F, C>
): Monad<ParametricStateT<F, S>, V<C, S>>
function getMonad_<S>(
  M: Monad<[HKT.UF_]>
): Monad<ParametricStateT<[HKT.UF_], S>, V<HKT.Auto, S>> {
  return HKT.instance(StateT.monad(M))
}
