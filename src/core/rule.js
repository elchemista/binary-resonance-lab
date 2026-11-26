import { rules } from './config.js'

export const operators = {
  history: (count, self, past) => (count & 1) ^ past,
  xor: (count) => count & 1,
  or: (count) => +(count > 0),
  and: (count, self, past, k) => +(count === k),
  exact: (count, self, past, k, threshold) => +(count === threshold),
  threshold: (count, self, past, k, threshold) => +(count >= threshold),
  memory: (count, self, past, k, threshold) => (count === threshold ? self : +(count > threshold)),
}

export function ruleTable(c) {
  const table = new Uint8Array(rules.length * 128)
  rules.forEach((name, r) => {
    for (let count = 0; count <= c.neighbors; count++)
      for (let self = 0; self < 2; self++)
        for (let past = 0; past < 2; past++) {
          table[r * 128 + count * 4 + self * 2 + past] = operators[name](
            count,
            self,
            past,
            c.neighbors,
            c.threshold,
          )
        }
  })
  return table
}
