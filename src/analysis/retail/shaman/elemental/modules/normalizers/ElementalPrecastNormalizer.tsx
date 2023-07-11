import { AnyEvent, CastEvent, EventType } from 'parser/core/Events';
import EventsNormalizer from 'parser/core/EventsNormalizer';

import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import MAGIC_SCHOOLS from 'game/MAGIC_SCHOOLS';

const elemental_abilities = [
  SPELLS.WIND_GUST.id,
  SPELLS.EYE_OF_THE_STORM.id,
  SPELLS.CALL_LIGHTNING.id,
];

const ELEMENTAL_DURATION = 30000;

export default class PrecastElementalNormalizer extends EventsNormalizer {
  findLastCast(events: AnyEvent[], spellId: number): AnyEvent | undefined {
    return events
      .filter((event) => event.timestamp <= this.owner.fight.start_time + 40000)
      .reverse()
      .find((event) => {
        if (event.type === 'cast' && elemental_abilities.includes(event.ability.guid)) {
          return event;
        }

        return undefined;
      });
  }

  normalize(events: AnyEvent[]): AnyEvent[] {
    for (const event of events) {
      // We found a cast event before anything else, so we can stop here.
      if (event.type === 'cast' && event.ability.guid === TALENTS.STORM_ELEMENTAL_TALENT.id) {
        break;
      }

      if (event.type === 'cast' && elemental_abilities.includes(event.ability.guid)) {
        const lastElementalCast = this.findLastCast(events, TALENTS.STORM_ELEMENTAL_TALENT.id);
        const roughElementalCastTime = lastElementalCast
          ? lastElementalCast.timestamp - ELEMENTAL_DURATION
          : 0;

        const fabricatedAbility = {
          guid: TALENTS.STORM_ELEMENTAL_TALENT.id,
          type: MAGIC_SCHOOLS.ids.NATURE,
          name: TALENTS.STORM_ELEMENTAL_TALENT.name,
          abilityIcon: TALENTS.STORM_ELEMENTAL_TALENT.icon,
        };
        const fabricatedEvent: CastEvent = {
          type: EventType.Cast,
          ability: fabricatedAbility,
          sourceID: this.owner.player.id,
          sourceIsFriendly: true,
          targetIsFriendly: event.targetIsFriendly,
          targetID: event.targetID,
          timestamp: roughElementalCastTime,
          prepull: true,
          __fabricated: true,
        };
        events.splice(0, 0, fabricatedEvent);
        break;
      }
    }

    return events;
  }
}
