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
import { formatDuration } from 'common/format';

interface SKTimeline {
  start: number;
  end: number;
  events: CastEvent[];
  performance: QualitativePerformance;
}

interface SKCast extends SpellCast {
  maelstromOnCast: number;
  flameshockDurationOnCast: number;
  electrifiedShocksDurationOnCast: number;
  sopOnCast: boolean;
  moteOnCast: boolean;
  timeline: SKTimeline;
  _hasStartedRotation: boolean;
}

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

  activeCooldown: SKCast | null;

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
    this.activeCooldown = null;
  }

  onCast(cast: CastEvent) {
    this.activeCooldown = {
      event: cast,
      maelstromOnCast: this.maelstromTracker.current,
      flameshockDurationOnCast: this.getActiveFlSDuration(cast),
      electrifiedShocksDurationOnCast: this.getActiveElShocksDuration(cast),
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
    if (!this.activeCooldown) {
      return;
    }

    if (
      !this.activeCooldown._hasStartedRotation &&
      [
        SPELLS.LIGHTNING_BOLT.id,
        TALENTS.CHAIN_LIGHTNING_TALENT.id,
        TALENTS.LAVA_BURST_TALENT.id,
        TALENTS.EARTH_SHOCK_TALENT.id,
        TALENTS.ELEMENTAL_BLAST_TALENT.id,
      ].includes(event.ability.guid)
    ) {
      this.activeCooldown._hasStartedRotation = true;
    }

    if (event.ability.guid === SPELLS.FLAME_SHOCK.id && !this.activeCooldown._hasStartedRotation) {
      this.activeCooldown.flameshockDurationOnCast = 18000;
      console.log(
        formatDuration(event.timestamp - this.owner.fight.start_time),
        'fls',
        this.activeCooldown.flameshockDurationOnCast,
      );
    }

    if (
      event.ability.guid === TALENTS.FROST_SHOCK_TALENT.id &&
      !this.activeCooldown._hasStartedRotation
    ) {
      this.activeCooldown.electrifiedShocksDurationOnCast = 9000;
      console.log(
        formatDuration(event.timestamp - this.owner.fight.start_time),
        'frs',
        this.activeCooldown.electrifiedShocksDurationOnCast,
      );
    }

    this.activeCooldown.timeline.events.push(event);
  }

  onSKFalloff(event: RemoveBuffEvent) {
    if (!this.activeCooldown) {
      return;
    }

    this.activeCooldown.timeline.end = event.timestamp;

    this.recordCooldown(this.activeCooldown);
    this.activeCooldown = null;
  }

  getActiveFlSDuration(cast: CastEvent) {
    const enemies = this.enemies.getEntities();
    let maxFlSDuration = 0;
    Object.values(enemies).forEach((enemy) => {
      maxFlSDuration = Math.max(
        maxFlSDuration,
        enemy.getRemainingBuffTimeAtTimestamp(SPELLS.FLAME_SHOCK.id, 18000, 24000, cast.timestamp),
      );
    });

    return maxFlSDuration;
  }

  getActiveElShocksDuration(cast: CastEvent) {
    const enemies = this.enemies.getEntities();
    let maxElShocksDuration = 0;
    Object.values(enemies).forEach((enemy) => {
      maxElShocksDuration = Math.max(
        maxElShocksDuration,
        enemy.getRemainingBuffTimeAtTimestamp(
          TALENTS.ELECTRIFIED_SHOCKS_TALENT.id,
          9000,
          9000,
          cast.timestamp,
        ),
      );
    });

    return maxElShocksDuration;
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
    let base_maelstrom_requirement = 90;
    if (cast.sopOnCast) {
      base_maelstrom_requirement -= 75;
    }

    let maelstromOnCastPerformance = QualitativePerformance.Fail;
    if (cast.maelstromOnCast > 138) {
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
      check: 'stormkeeper',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  _explainFlsPerformance(cast: SKCast) {
    let FlSPerformance = QualitativePerformance.Ok;

    if (cast.flameshockDurationOnCast > 10000) {
      FlSPerformance = QualitativePerformance.Perfect;
    }

    const checklistItem = {
      performance: FlSPerformance,
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
      check: 'stormkeeper',
      timestamp: cast.event.timestamp,
    };

    return checklistItem;
  }

  _explainElShocksPerformance(cast: SKCast) {
    let ElShocksPerformance = QualitativePerformance.Ok;

    if (cast.electrifiedShocksDurationOnCast > 6000) {
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
      check: 'stormkeeper',
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

        if (!moteActive && !this.spellUsable.isAvailable(TALENTS.LAVA_BURST_TALENT.id)) {
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

    console.log('skcat', cast);
  }

  _explainAPLWithDetails(cast: SKCast) {
    this._processTimelineEvents(cast);

    const checklistItem = {
      performance: cast.timeline.performance,
      summary: <span>Spell order</span>,
      details: <span>Spell order: See below</span>,
      check: 'stormkeeper',
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
    const FlSDuration = this._explainFlsPerformance(cast);
    const ELShocksperf = this._explainElShocksPerformance(cast);

    const totalPerformance = getLowestPerf([
      APL.checklistItem.performance,
      maelstromOnCast.performance,
      FlSDuration.performance === QualitativePerformance.Perfect
        ? QualitativePerformance.Perfect
        : QualitativePerformance.Good,
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
