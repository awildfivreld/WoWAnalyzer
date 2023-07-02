import TALENTS from 'common/TALENTS/shaman';
import SPELLS from 'common/SPELLS/shaman';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import ResourceTracker from 'parser/shared/modules/resources/resourcetracker/ResourceTracker';

class MaelstromTracker extends ResourceTracker {
  constructor(...args) {
    super(...args);
    this.resource = RESOURCE_TYPES.MAELSTROM;
    this.maxResource = 100;

    if (this.selectedCombatant.hasTalent(TALENTS.SWELLING_MAELSTROM_TALENT)) {
      this.maxResource += 50;
    }
  }

  generatedByOverload(spells = null) {
    if (!spells) {
      spells = [
        SPELLS.LIGHTNING_BOLT_OVERLOAD_HIT.id,
        SPELLS.LIGHTNING_BOLT_OVERLOAD.id,
        SPELLS.CHAIN_LIGHTNING_OVERLOAD.id,
        SPELLS.ICEFURY_OVERLOAD.id,
        SPELLS.LAVA_BURST_OVERLOAD.id,
        SPELLS.LAVA_BURST_OVERLOAD_DAMAGE.id,
      ];
    }
    return spells.map((spell) => this.getGeneratedBySpell(spell)).reduce((a, b) => a + b, 0);
  }
}
export default MaelstromTracker;
