import { CastEvent } from 'parser/core/Events';
import CoreGlobalCooldown from 'parser/shared/modules/GlobalCooldown';

class EleGlobalCooldown extends CoreGlobalCooldown {
  onCast(event: CastEvent) {
    super.onCast(event);
  }
}

export default EleGlobalCooldown;
