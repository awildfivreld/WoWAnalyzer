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
  lastSKHardcast: CastEvent | null;
  lastGeneratedByOverload: number;

  damageDoneByBuffedCasts = 0;

  constructor(options: Options) {
    super({ spell: TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT }, options);

    this.activeWindow = null;
    this.lastSKHardcast = null;
    this.lastGeneratedByOverload = 0;

    this.addEventListener(Events.cast.by(SELECTED_PLAYER), this.onEvent);
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT),
      this.onCast,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(TALENTS.STORMKEEPER_1_ELEMENTAL_TALENT),
      this.onSKFalloff,
    );
  }

  onCast(cast: CastEvent) {
    this.lastSKHardcast = cast;
    this.lastGeneratedByOverload = this.maelstromTracker.generatedByOverload();
  }

  onEvent(event: CastEvent) {
    /* Don't include events that did not happen between hardcasts and the
    SK buff falling off. */
    if (!this.lastSKHardcast) {
      return;
    }

    if (
      !this.activeWindow &&
      [
        SPELLS.LIGHTNING_BOLT.id,
        TALENTS.CHAIN_LIGHTNING_TALENT.id,
        TALENTS.LAVA_BURST_TALENT.id,
        TALENTS.EARTH_SHOCK_TALENT.id,
        TALENTS.ELEMENTAL_BLAST_TALENT.id,
      ].includes(event.ability.guid)
    ) {
      this.activeWindow = {
        event: this.lastSKHardcast,
        maelstromOnCast: this.maelstromTracker.current,
        /* Snapshot FS and elshocks here, but these might be overriden later,
        if the user cast these spells before starting the actual rotation. */
        flameshockDurationOnCast: this.enemies.getLongestDurationRemaining(
          SPELLS.FLAME_SHOCK.id,
          18000,
          24000,
          event.timestamp,
        ),
        electrifiedShocksDurationOnCast: this.enemies.getLongestDurationRemaining(
          TALENTS.ELECTRIFIED_SHOCKS_TALENT.id,
          9000,
          9000,
          event.timestamp,
        ),
        sopOnCast: this.selectedCombatant.hasBuff(SPELLS.SURGE_OF_POWER_BUFF.id),
        moteOnCast: this.selectedCombatant.hasBuff(SPELLS.MASTER_OF_THE_ELEMENTS_BUFF.id),
        timeline: {
          start: this.lastSKHardcast.timestamp,
          end: -1,
          events: [this.lastSKHardcast],
          performance: QualitativePerformance.Perfect,
        },
      };

      /* If the user started the window with a spender, then the maelstrom
      has already been consumed */
      if (event.ability.guid === TALENTS.ELEMENTAL_BLAST_TALENT.id) {
        this.activeWindow.maelstromOnCast += 75;
      }
    }

    if (this.activeWindow) {
      if (
        event.ability.guid === TALENTS.ELEMENTAL_BLAST_TALENT.id &&
        !this.selectedCombatant.hasBuff(SPELLS.MASTER_OF_THE_ELEMENTS_BUFF.id, event.timestamp, 100)
      ) {
        event.meta = {
          isInefficientCast: true,
          inefficientCastReason: <>Elemental Blast cast without Master of the Elements</>,
        };
        this.activeWindow.timeline.performance = getLowestPerf([
          QualitativePerformance.Ok,
          this.activeWindow.timeline.performance,
        ]);
      }

      if (
        (event.ability.guid === SPELLS.LIGHTNING_BOLT.id ||
          event.ability.guid === TALENTS.CHAIN_LIGHTNING_TALENT.id) &&
        !this.selectedCombatant.hasBuff(SPELLS.SURGE_OF_POWER_BUFF.id, event.timestamp, 100)
      ) {
        event.meta = {
          isInefficientCast: true,
          inefficientCastReason: <>{event.ability.name} cast without Surge of Power</>,
        };
        this.activeWindow.timeline.performance = getLowestPerf([
          QualitativePerformance.Fail,
          this.activeWindow.timeline.performance,
        ]);
      }

      this.activeWindow.timeline.events.push(event);
    }
  }

  onSKFalloff(event: RemoveBuffEvent) {
    if (!this.activeWindow) {
      return;
    }

    this.activeWindow.timeline.end = event.timestamp;

    this.recordCooldown(this.activeWindow);
    this.lastSKHardcast = null;
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
    /* How much maelstrom the first builder of the window generates.
    
    Nowadays that should be 12 (LvB)
    
    */
    const firstCastMaelstrnGen = 12;

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

    let maelstromOnCastPerformance = QualitativePerformance.Ok;
    if (cast.maelstromOnCast > this.maelstromTracker.maxResource - firstCastMaelstrnGen) {
      maelstromOnCastPerformance = QualitativePerformance.Good;
    } else if (cast.maelstromOnCast >= base_maelstrom_requirement) {
      maelstromOnCastPerformance = QualitativePerformance.Perfect;
    }

    const imperfectDetails = (
      <>
        (Should have been {base_maelstrom_requirement}-
        {this.maelstromTracker.maxResource - firstCastMaelstrnGen})
      </>
    );

    const checklistItem = {
      performance: maelstromOnCastPerformance,
      summary: (
        <span>
          {cast.maelstromOnCast} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} />
        </span>
      ),
      details: (
        <span>
          {cast.maelstromOnCast} <ResourceLink id={RESOURCE_TYPES.MAELSTROM.id} /> on window start{' '}
          {maelstromOnCastPerformance !== QualitativePerformance.Perfect && imperfectDetails}
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

  _explainAPLWithDetails(cast: SKCast) {
    const checklistItem = {
      performance: cast.timeline.performance,
      summary: <span>Spell order</span>,
      details: <span>Spell order: See below</span>,
      check: 'stormkeeper-timeline',
      timestamp: cast.event.timestamp,
    };

    const extraDetails = (
      <div
        style={{
          overflowX: 'scroll',
        }}
      >
        <EmbeddedTimelineContainer
          secondWidth={60}
          secondsShown={(cast.timeline.end - cast.timeline.start) / 1000}
        >
          <SpellTimeline>
            <Casts
              start={cast.event.timestamp}
              movement={undefined}
              secondWidth={60}
              events={cast.timeline.events}
            />
          </SpellTimeline>
        </EmbeddedTimelineContainer>
      </div>
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
