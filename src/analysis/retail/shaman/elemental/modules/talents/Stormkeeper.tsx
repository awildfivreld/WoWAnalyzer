import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/shaman';
import { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, DamageEvent, RemoveBuffEvent } from 'parser/core/Events';
import { ResourceLink, SpellLink } from 'interface';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Statistic from 'parser/ui/Statistic';
import { STATISTIC_ORDER } from 'parser/ui/StatisticBox';
import MajorCooldown, { SpellCast } from 'parser/core/MajorCooldowns/MajorCooldown';
import { getLowestPerf, QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SpellUse } from 'parser/core/SpellUsage/core';
import { MaelstromTracker } from 'analysis/retail/shaman/shared';
import Enemies from 'parser/shared/modules/Enemies';
import SpellUsable from 'parser/shared/modules/SpellUsable';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import EmbeddedTimelineContainer, {
  SpellTimeline,
} from 'interface/report/Results/Timeline/EmbeddedTimeline';
import Casts from 'interface/report/Results/Timeline/Casts';

interface SKTimeline {
  /** The start time (in ms) of the window */
  start: number;
  /** The end time (in ms) of the window */
  end: number;
  /** The events that happened inside the window */
  events: CastEvent[];
  /** The performance of the window */
  performance: QualitativePerformance;
}

interface SKCast extends SpellCast {
  /** How much maelstrom the user had when starting the window rotation */
  maelstromOnCast: number;
  /** How long Flameshock had left when starting the window rotation */
  flameshockDurationOnCast: number;
  /** How long Electrified shocks had left when starting the window rotation */
  electrifiedShocksDurationOnCast: number;
  /** If the user had Surge of Power already active when casting SK */
  sopOnCast: boolean;
  /** If the user had Master of the Elements already active when casting SK */
  moteOnCast: boolean;
  /** What the user cast between casting SK and consuming the second buff. */
  timeline: SKTimeline;
  _hasStartedRotation: boolean;
}

const GUIDE_BASE_MAELSTROM_REQUIREMENT = 90;
const GUIDE_FLAMESHOCK_DURATION_PERFECT = 10000;
const GUIDE_ELSHOCKS_DURATION_PERFECT = 6000;

class Stormkeeper extends MajorCooldown<SKCast> {
  static dependencies = {
    ...MajorCooldown.dependencies,
    maelstromTracker: MaelstromTracker,
    enemies: Enemies,
    spellUsable: SpellUsable,
  };
  protected maelstromTracker!: MaelstromTracker;
  protected enemies!: Enemies;
  protected spellUsable!: SpellUsable;

  activeWindow: SKCast | null;

  damageDoneByBuffedCasts = 0;

  constructor(options: Options) {
    super({ spell: TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT }, options);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER), this.onEvent);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT),
      this.onCast,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT),
      this.onSKFalloff,
    );
    this.activeWindow = null;
  }

  onCast(cast: CastEvent) {
    this.activeWindow = {
      event: cast,
      maelstromOnCast: this.maelstromTracker.current,
      /* Snapshot FS and elshocks here, but these might be overriden later,
      if the user cast these spells before starting the actual rotation. */
      flameshockDurationOnCast: this.enemies.getLongestDurationRemaining(
        SPELLS.FLAME_SHOCK.id,
        18000,
        24000,
        cast.timestamp,
      ),
      electrifiedShocksDurationOnCast: this.enemies.getLongestDurationRemaining(
        TALENTS.ELECTRIFIED_SHOCKS_TALENT.id,
        9000,
        9000,
        cast.timestamp,
      ),
      sopOnCast: this.selectedCombatant.hasBuff(SPELLS.SURGE_OF_POWER_BUFF.id),
      moteOnCast: this.selectedCombatant.hasBuff(SPELLS.MASTER_OF_THE_ELEMENTS_BUFF.id),
      timeline: {
        start: cast.timestamp,
        end: -1,
        events: [cast],
        performance: QualitativePerformance.Perfect,
      },
      _hasStartedRotation: false,
    };
  }

  onEvent(event: CastEvent) {
    if (!this.activeWindow) {
      return;
    }

    if (
      !this.activeWindow._hasStartedRotation &&
      [
        SPELLS.LIGHTNING_BOLT.id,
        TALENTS.CHAIN_LIGHTNING_TALENT.id,
        TALENTS.LAVA_BURST_TALENT.id,
        TALENTS.EARTH_SHOCK_TALENT.id,
        TALENTS.ELEMENTAL_BLAST_TALENT.id,
      ].includes(event.ability.guid)
    ) {
      this.activeWindow._hasStartedRotation = true;
    }

    if (event.ability.guid === SPELLS.FLAME_SHOCK.id && !this.activeWindow._hasStartedRotation) {
      /* This might be slightly simplified, but if the user cast FS after SK,
      it won't expire in the window anyway. */
      this.activeWindow.flameshockDurationOnCast = 18000;
    }

    if (
      event.ability.guid === TALENTS.FROST_SHOCK_TALENT.id &&
      !this.activeWindow._hasStartedRotation
    ) {
      /* This might be slightly simplified, but if the user cast FS after SK,
      it won't expire in the window anyway. */
      this.activeWindow.electrifiedShocksDurationOnCast = 9000;
    }

    this.activeWindow.timeline.events.push(event);
  }

  onSKFalloff(event: RemoveBuffEvent) {
    if (!this.activeWindow) {
      return;
    }

    this.activeWindow.timeline.end = event.timestamp;

    this.recordCooldown(this.activeWindow);
    this.activeWindow = null;
  }

  description() {
    return (
      <>
        <strong>Stormkeeper - </strong>When casting{' '}
        <SpellLink id={TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT} />, the main goal is to empower both
        spender windows with as many other buffs as possible. A successful stormkeeper window
        requires that you have enough maelstrom going in, and that all buffs last through the entire
        window.
        <br />
        <br />
      </>
    );
  }

  _explainMaelstromPerformance(cast: SKCast) {
    /* How much maelstrom the first builder of the window generates */
    const firstCastMaelstrnGen = 14;

    let spenderCost;
    if (this.selectedCombatant.hasTalent(TALENTS.ELEMENTAL_BLAST_TALENT)) {
      spenderCost = 75;
    } else {
      spenderCost = 50;
    }

    let base_maelstrom_requirement = GUIDE_BASE_MAELSTROM_REQUIREMENT;
    /* The user has already cast one spender, so they don't need the maelstrom for two. */
    if (cast.sopOnCast) {
      base_maelstrom_requirement -= spenderCost;
    }

    let maelstromOnCastPerformance = QualitativePerformance.Fail;
    if (cast.maelstromOnCast > this.maelstromTracker.maxResource - firstCastMaelstrnGen) {
      maelstromOnCastPerformance = QualitativePerformance.Good;
    } else if (cast.maelstromOnCast >= base_maelstrom_requirement) {
      maelstromOnCastPerformance = QualitativePerformance.Perfect;
    }

    const checklistItem = {
      performance: maelstromOnCastPerformance,
      summary: (
        <span>
          {cast.maelstromOnCast} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} />
        </span>
      ),
      details: (
        <span>
          {cast.maelstromOnCast} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} /> on window start
        </span>
      ),
      check: 'stormkeeper-maelstrom',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  _explainFSPerformance(cast: SKCast) {
    let FSPerformance = QualitativePerformance.Ok;

    if (cast.flameshockDurationOnCast > GUIDE_FLAMESHOCK_DURATION_PERFECT) {
      FSPerformance = QualitativePerformance.Perfect;
    }

    const checklistItem = {
      performance: FSPerformance,
      summary: (
        <span>
          <SpellLink id={SPELLS.FLAME_SHOCK} />: {cast.flameshockDurationOnCast / 1000}s{' '}
        </span>
      ),
      details: (
        <span>
          {' '}
          <SpellLink id={SPELLS.FLAME_SHOCK} />: {cast.flameshockDurationOnCast / 1000}s remaining
          on window start
        </span>
      ),
      check: 'stormkeeper-flameshock',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  _explainElShocksPerformance(cast: SKCast) {
    let ElShocksPerformance = QualitativePerformance.Ok;

    if (cast.electrifiedShocksDurationOnCast > GUIDE_ELSHOCKS_DURATION_PERFECT) {
      ElShocksPerformance = QualitativePerformance.Perfect;
    }

    const checklistItem = {
      performance: ElShocksPerformance,
      summary: (
        <span>
          <SpellLink id={TALENTS.ELECTRIFIED_SHOCKS_TALENT} />:{' '}
          {cast.electrifiedShocksDurationOnCast / 1000}s
        </span>
      ),
      details: (
        <span>
          {' '}
          <SpellLink id={TALENTS.ELECTRIFIED_SHOCKS_TALENT} />:{' '}
          {cast.electrifiedShocksDurationOnCast / 1000}s remaining on window start
        </span>
      ),
      check: 'stormkeeper-elshocks',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  _processTimelineEvents(cast: SKCast) {
    // This APL analysis is extremely rudementary, but I haven't gotten to look at the actual
    // APL stuff yet.
    const timeline = cast.timeline;
    let sopActive = cast.sopOnCast;
    let moteActive = cast.moteOnCast;

    timeline.events.forEach((event, i) => {
      let isCorrect = true;
      let isInefficientReason = '';

      if (event.ability.guid === TALENTS.LAVA_BURST_TALENT.id) {
        moteActive = true;
      }

      if (event.ability.guid === TALENTS.EARTHQUAKE_TALENT.id) {
        sopActive = true;
      }

      if (event.ability.guid === TALENTS.ELEMENTAL_BLAST_TALENT.id) {
        sopActive = true;

        if (!moteActive) {
          isCorrect = false;
          isInefficientReason =
            'Elemental blast should be empowered by Master of the Elements (Lava Burst cast directly before it)';
          timeline.performance = getLowestPerf([QualitativePerformance.Ok, timeline.performance]);
        }

        moteActive = false;
      }

      if (
        event.ability.guid === SPELLS.LIGHTNING_BOLT.id ||
        event.ability.guid === TALENTS.CHAIN_LIGHTNING_TALENT.id
      ) {
        if (!sopActive) {
          isCorrect = false;
          isInefficientReason =
            'This ' +
            event.ability.name +
            ' should have been empowered by a Surge of Power (cast a spender directly before it). You probably cast something else between your spender and this spell, or did not cast a spender in between.';
          timeline.performance = getLowestPerf([QualitativePerformance.Fail, timeline.performance]);
        }

        sopActive = false;
      }

      if (!isCorrect) {
        event.meta = { isInefficientCast: true, inefficientCastReason: isInefficientReason };
      }
    });
  }

  _explainAPLWithDetails(cast: SKCast) {
    this._processTimelineEvents(cast);

    const checklistItem = {
      performance: cast.timeline.performance,
      summary: <span>Spell order</span>,
      details: <span>Spell order: See below</span>,
      check: 'stormkeeper-timeline',
      timestamp: cast.event.timestamp,
    };

    const extraDetails = (
      <EmbeddedTimelineContainer
        secondWidth={100}
        secondsShown={(cast.timeline.end - cast.timeline.start) / 1000}
      >
        <SpellTimeline>
          <Casts
            start={cast.event.timestamp}
            movement={undefined}
            secondWidth={100}
            events={cast.timeline.events}
          />
        </SpellTimeline>
      </EmbeddedTimelineContainer>
    );

    return { extraDetails, checklistItem };
  }

  explainPerformance(cast: SKCast): SpellUse {
    const APL = this._explainAPLWithDetails(cast);
    const maelstromOnCast = this._explainMaelstromPerformance(cast);
    const FlSDuration = this._explainFSPerformance(cast);
    const ELShocksperf = this._explainElShocksPerformance(cast);

    const totalPerformance = getLowestPerf([
      APL.checklistItem.performance,
      maelstromOnCast.performance,
      /* Failing this should not nuke the entire performance, so make the lower limit Good */
      FlSDuration.performance === QualitativePerformance.Perfect
        ? QualitativePerformance.Perfect
        : QualitativePerformance.Good,
      /* Failing this should not nuke the entire performance, so make the lower limit Good */
      ELShocksperf.performance === QualitativePerformance.Perfect
        ? QualitativePerformance.Perfect
        : QualitativePerformance.Good,
    ]);

    return {
      event: cast.event,
      performance: totalPerformance,
      checklistItems: [APL.checklistItem, maelstromOnCast, ELShocksperf, FlSDuration],
      extraDetails: APL.extraDetails,
    };
  }

  onSKDamage(event: DamageEvent) {
    if (!this.selectedCombatant.hasBuff(TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT.id)) {
      return;
    }

    this.damageDoneByBuffedCasts += event.amount + (event.absorbed || 0);
  }

  statistic() {
    return (
      <Statistic position={STATISTIC_ORDER.OPTIONAL()} size="flexible">
        <BoringSpellValueText spellId={TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT.id}>
          <>
            <ItemDamageDone amount={this.damageDoneByBuffedCasts} />
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default Stormkeeper;
