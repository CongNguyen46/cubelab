// Renderer: React Three Fiber scene, cube model and turn animation.
// It only animates what the engine reports; it never owns cube state.
// The scene itself (CubeScene.tsx) is imported lazily by the app so three.js stays out of
// the first bundle. Import it by path, not from here.
export { TurnAnimator, type AnimatorOptions } from './animator.ts'
export { ease, matToQuaternion, syncToState, type CubieView } from './turn.ts'
