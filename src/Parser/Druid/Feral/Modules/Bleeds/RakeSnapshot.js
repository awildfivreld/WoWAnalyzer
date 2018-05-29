import React from 'react';
import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';
import { formatPercentage } from 'common/format';
import Snapshot, { JAGGED_WOUNDS_MODIFIER, PANDEMIC_FRACTION } from '../FeralCore/Snapshot';

/*
Identify inefficient refreshes of the Rake DoT:
  Early refresh of a Rake doing double damage due to Prowl with one that will not do double damage.
  Pre-pandemic refresh of a Rake doing bonus damage from snapshot buffs with one that will do less damage.
*/

// When you cannot refresh a prowl-buffed rake with prowl, ideally you'd let it tick down. At the
// moment that it expires apply your new one.
// Looking for exact timing is unrealistic, so give some leeway.
const FORGIVE_PROWL_LOSS_TIME = 1000;

const RAKE_BASE_DURATION = 15000;
class RakeSnapshot extends Snapshot {
  rakeCastCount = 0;        // count of rake casts of all kinds
  prowlLostCastCount = 0;   // count of rake buffed with Prowl ending early due to refresh without Prowl buff
  prowlLostTimeSum = 0;     // total time cut out from the end of prowl-buffed rake bleeds by refreshing early (milliseconds)
  downgradeCastCount = 0;   // count of rake DoTs refreshed with weaker snapshot before pandemic

  on_initialized() {
    this.spellCastId = SPELLS.RAKE.id;
    this.debuffId = SPELLS.RAKE_BLEED.id;
    this.durationOfFresh = RAKE_BASE_DURATION;
    this.isProwlAffected = true;
    this.isTigersFuryAffected = true;
    this.isBloodtalonsAffected = true;

    if (this.combatants.selected.hasTalent(SPELLS.JAGGED_WOUNDS_TALENT.id)) {
      this.durationOfFresh *= JAGGED_WOUNDS_MODIFIER;
    }
  }

  on_byPlayer_cast(event) {
    if (SPELLS.RAKE.id === event.ability.guid) {
      ++this.rakeCastCount;
    }
    super.on_byPlayer_cast(event);
  }

  checkRefreshRule(stateNew) {
    const stateOld = stateNew.prev;
    const event = stateNew.castEvent;
    if (!stateOld || stateOld.expireTime < stateNew.startTime) {
      // it's not a refresh, so nothing to check
      return;
    }

    if (stateOld.prowl && !stateNew.prowl) {
      // refresh removed a powerful prowl-buffed bleed
      const timeLost = stateOld.expireTime - stateNew.startTime;
      this.prowlLostTimeSum += timeLost;
      
      // only mark significant time loss events. Still add up the "insignificant" time lost for possible suggestion.
      if (timeLost > FORGIVE_PROWL_LOSS_TIME) {
        ++this.prowlLostCastCount;
        event.meta = event.meta || {};
        event.meta.isInefficientCast = true;
        event.meta.inefficientCastReason = `You lost ${(timeLost / 1000).toFixed(1)} seconds of a Rake empowered with Prowl by refreshing early.`;
      }
    } else if (stateOld.pandemicTime > stateNew.startTime &&
        stateOld.power > stateNew.power &&
        !stateNew.prowl) {
      // refreshed with weaker DoT before pandemic window - but ignore this rule if the new Rake has Prowl buff as that's more important.
      ++this.downgradeCastCount;

      if (!event.meta || (!event.meta.isInefficientCast && !event.meta.isEnhancedCast)) {
        // this downgrade is relatively minor, so don't overwrite output from elsewhere.
        event.meta = event.meta || {};
        event.meta.isInefficientCast = true;
        event.meta.inefficientCastReason = `You refreshed with a weaker version of Rake before the pandemic window.`;
      }
    }
  }

  // seconds of double-damage Rake lost per minute
  get prowlLostTimePerMinute() {
    return (this.prowlLostTimeSum / this.owner.fightDuration) * 60;
  }
  get downgradeProportion() {
    return this.downgradeCastCount / this.rakeCastCount;
  }
  get prowlLostSuggestionThresholds() {
    return {
      actual: this.prowlLostTimePerMinute,
      isGreaterThan: {
        minor: 0.5,
        average: 1.5,
        major: 3.0,
      },
      style: 'decimal',
    };
  }
  get downgradeSuggestionThresholds() {
    return {
      actual: this.downgradeProportion,
      isGreaterThan: {
        minor: 0,
        average: 0.15,
        major: 0.30,
      },
      style: 'percentage',
    };
  }

  suggestions(when) {
    when(this.prowlLostSuggestionThresholds).addSuggestion((suggest, actual, recommended) => {
      return suggest(
        <React.Fragment>
          When <SpellLink id={SPELLS.RAKE.id} /> is empowered by <SpellLink id={SPELLS.PROWL.id} /> avoid refreshing it unless the replacement would also be empowered. You ended {this.prowlLostCastCount} empowered <SpellLink id={SPELLS.RAKE.id} /> bleed{this.prowlLostCastCount!==1?'s':''} more than 1 second early.
        </React.Fragment>
      )
        .icon(SPELLS.RAKE.icon)
        .actual(`${actual.toFixed(1)} seconds of Prowl buffed Rake was lost per minute.`)
        .recommended(`<${recommended} is recommended`);
    });

    when(this.downgradeSuggestionThresholds).addSuggestion((suggest, actual, recommended) => {
      return suggest(
        <React.Fragment>
          Try to only refresh <SpellLink id={SPELLS.RAKE.id} /> before the <dfn data-tip={`The last ${(this.durationOfFresh * PANDEMIC_FRACTION / 1000).toFixed(1)} seconds of Rake's duration. When you refresh during this time you don't lose any duration in the process.`}>pandemic window</dfn> if you have more powerful <dfn data-tip={"Applying Rake with Prowl, Tiger's Fury or Bloodtalons will boost its damage until you reapply it."}>snapshot buffs</dfn> than were present when it was first cast.
        </React.Fragment>
      )
        .icon(SPELLS.RAKE.icon)
        .actual(`${formatPercentage(actual)}% of Rake refreshes were early downgrades.`)
        .recommended(`${recommended}% is recommended`);
    });
  }
}
export default RakeSnapshot;
