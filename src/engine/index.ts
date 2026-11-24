// Cube engine: pure TypeScript cube state, moves and notation parser.
// No React and no three.js imports here, so it stays easy to test. Built in Sprint 1.

/** Face order used across the app: +x R, -x L, +y U, -y D, +z F, -z B. */
export const FACES = ['R', 'L', 'U', 'D', 'F', 'B'] as const
export type Face = (typeof FACES)[number]
