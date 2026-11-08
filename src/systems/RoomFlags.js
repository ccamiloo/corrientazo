// Flags simples por habitación, guardados en el registry: { [roomId]: { [flag]: valor } }.
// Sobreviven a la muerte y al reinicio de la escena, porque describen el estado del mundo, no de una vida.

const KEY = 'roomFlags';

function all(registry) {
  let flags = registry.get(KEY);
  if (!flags) {
    flags = {};
    registry.set(KEY, flags);
  }
  return flags;
}

export const RoomFlags = {
  get(registry, roomId, flag) {
    return all(registry)[roomId]?.[flag];
  },
  set(registry, roomId, flag, value = true) {
    const flags = all(registry);
    flags[roomId] ??= {};
    flags[roomId][flag] = value;
  },
  reset(registry) {
    registry.set(KEY, {});
  },
};
