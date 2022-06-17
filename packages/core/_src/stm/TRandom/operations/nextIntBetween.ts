/**
 * @tsplus static ets/TRandom/Ops nextIntBetween
 */
export function nextIntBetween(low: number, high: number): STM<TRandom, never, number> {
  return STM.serviceWithSTM(TRandom.Tag)((_) => _.nextIntBetween(low, high))
}