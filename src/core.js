// Public shared gameplay interface. No renderer, DOM, filesystem or wall clock.
export { Game, simulate } from './simulation.js';
export { HZ, DT, ISLAND_RADIUS, InputError, distance, distance3, seededRandom, neutralInput, validateInputs, validateScenario } from './rules.js';
