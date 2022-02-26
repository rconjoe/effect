import type { Either } from "../../../data/Either"
import * as STM from "../../../stm/STM/core"
import { Effect } from "../../Effect"
import * as S from "../../Semaphore"
import type { _A, _B, _EA, _EB, _RA, _RB } from "../definition"
import { XRefInternal } from "../definition"

export type Synchronized<A> = XSynchronized<unknown, unknown, never, never, A, A>

/**
 * A `XRef.Synchronized<RA, RB, EA, EB, A, B>` is a polymorphic, purely
 * functional description of a mutable reference. The fundamental operations
 * of a `XRef.Synchronized` are `set` and `get`. `set` takes a value of type
 * `A` and sets the reference to a new value, requiring an environment of type
 * `RA` and potentially failing with an error of type `EA`. `get` gets the
 * current value of the reference and returns a value of type `B`, requiring
 * an environment of type `RB` and potentially failing with an error of type
 * `EB`.
 *
 * When the error and value types of the `XRef.Synchronized` are unified, that
 * is, it is a `XRef.Synchronized<R, R, E, E, A, A>`, the `XRef.Synchronized`
 * also supports atomic `modify` and `update` operations.
 *
 * Unlike an ordinary `XRef`, a `XRef.Synchronized` allows performing effects
 * within update operations, at some cost to performance. Writes will
 * semantically block other writers, while multiple readers can read
 * simultaneously.
 *
 * `XRef.Synchronized` also supports composing multiple `XRef.Synchronized`
 * values together to form a single `XRef.Synchronized` value that can be
 * atomically updated using the `zip` operator. In this case reads and writes
 * will semantically block other readers and writers.
 *
 * @tsplus type ets/XSynchronized
 */
export class XSynchronized<RA, RB, EA, EB, A, B> extends XRefInternal<
  RA,
  RB,
  EA,
  EB,
  A,
  B
> {
  readonly _tag = "Synchronized"

  constructor(
    readonly semaphores: Set<S.Semaphore>,
    readonly unsafeGet: Effect<RB, EB, B>,
    readonly unsafeSet: (a: A) => Effect<RA, EA, void> // readonly unsafeSetAsync: (a: A) => T.Effect<RA, EA, void>
  ) {
    super()
  }

  get _get(): Effect<RB, EB, B> {
    if (this.semaphores.size === 1) {
      return this.unsafeGet
    } else {
      return this._withPermit(this.unsafeGet)
    }
  }

  _set(a: A): Effect<RA, EA, void> {
    return this._withPermit(this.unsafeSet(a))
  }

  _fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XSynchronized<RA, RB, EC, ED, C, D> {
    return foldEffect_(
      this,
      ea,
      eb,
      (c) => Effect.fromEither(ca(c)),
      (b) => Effect.fromEither(bd(b))
    )
  }

  _foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XSynchronized<RA & RB, RB, EC, ED, C, D> {
    return foldAllEffect_(
      this,
      ea,
      eb,
      ec,
      (c) => (b) => Effect.fromEither(ca(c)(b)),
      (b) => Effect.fromEither(bd(b))
    )
  }

  _withPermit<R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> {
    return Effect.uninterruptibleMask(({ restore }) =>
      restore(STM.commit(STM.forEach_(this.semaphores, S.acquire))).flatMap(() =>
        restore(effect).ensuring(STM.commit(STM.forEach_(this.semaphores, S.release)))
      )
    )
  }
}

/**
 * @tsplus type ets/XSynchronizedOps
 */
export interface XSynchronizedOps {}
export const Synchronized: XSynchronizedOps = {}

/**
 * @tsplus unify ets/XSynchronized
 */
export function unifyXSynchronized<
  X extends XSynchronized<any, any, any, any, any, any>
>(
  self: X
): XSynchronized<
  [X] extends [{ [k in typeof _RA]: (_: infer RA) => void }] ? RA : never,
  [X] extends [{ [k in typeof _RB]: (_: infer RB) => void }] ? RB : never,
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is
 * a highly polymorphic method that is capable of arbitrarily transforming
 * the error and value types of the `XRef.Synchronized`. For most use cases
 * one of the more specific combinators implemented in terms of `foldEffect`
 * will be more ergonomic but this method is extremely useful for
 * implementing new combinators.
 *
 * @tsplus fluent ets/XSynchronized foldEffect
 */
export function foldEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Effect<RC, EC, A>,
  bd: (_: B) => Effect<RD, ED, D>
): XSynchronized<RA & RC, RB & RD, EC, ED, C, D> {
  return new XSynchronized(
    self.semaphores,
    self.unsafeGet.foldEffect((e) => Effect.failNow(eb(e)), bd),
    (c) => ca(c).flatMap((a) => self.unsafeSet(a).mapError(ea))
  )
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is
 * a highly polymorphic method that is capable of arbitrarily transforming
 * the error and value types of the `XRef.Synchronized`. For most use cases
 * one of the more specific combinators implemented in terms of `foldEffect`
 * will be more ergonomic but this method is extremely useful for
 * implementing new combinators.
 *
 * @ets_data_first foldEffect_
 */
export function foldEffect<RC, RD, EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Effect<RC, EC, A>,
  bd: (_: B) => Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB & RD, EC, ED, C, D> => self.foldEffect(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more
 * powerful version of `foldEffect` but requires unifying the environment and
 * error types.
 *
 * @tsplus fluent ets/XSynchronized foldAllEffect
 */
export function foldAllEffect_<RA, RB, RC, RD, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Effect<RC, EC, A>,
  bd: (_: B) => Effect<RD, ED, D>
): XSynchronized<RA & RB & RC, RB & RD, EC, ED, C, D> {
  return new XSynchronized(
    self.semaphores,
    self._get.foldEffect((e) => Effect.failNow(eb(e)), bd),
    (c) =>
      self._get.foldEffect(
        (e) => Effect.failNow(ec(e)),
        (b) => ca(c)(b).flatMap((a) => self.unsafeSet(a).mapError(ea))
      )
  )
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more
 * powerful version of `foldEffect` but requires unifying the environment and
 * error types.
 *
 * @ets_data_first foldAllEffect_
 */
export function foldAllEffect<RC, RD, EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Effect<RC, EC, A>,
  bd: (_: B) => Effect<RD, ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RB & RC, RB & RD, EC, ED, C, D> =>
    self.foldAllEffect(ea, eb, ec, ca, bd)
}